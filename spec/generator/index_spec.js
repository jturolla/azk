import { config, path, fs, _ } from 'azk';
import h from 'spec/spec_helper';
import { Generator } from 'azk/generator';
import { Manifest } from 'azk/manifest';
import { example_system as node_example }  from 'azk/generator/rules/node';

var touch = require('touch');

describe("Azk generator tool", function() {
  var outputs = [];
  var UI = h.mockUI(beforeEach, outputs);
  var generator = new Generator(UI);

  it("should load default rules", function() {
    var node = generator.rule("node");
    h.expect(node).to.have.property("type", "runtime");
  });

  describe("run in a directory", function() {
    var dir;

    before(() => {
      return h.tmp_dir().then((tmp) => {
        dir = tmp;
      });
    });

    // Genereate manifest file
    var generate_manifest = (dir, data) => {
      var file = path.join(dir, config('manifest'));
      generator.render(data, file);
      return new Manifest(dir);
    };

    var default_data = {
      systems: {
        front: {
          depends: ['db'],
          workdir: '/azk/#{manifest.dir}',
          image: { repository: 'base', tag: '0.1' },
          scalable: true,
          http: true,
          mount_folders: {
            ".": "/azk/#{manifest.dir}",
          },
          command: 'bundle exec rackup config.ru',
          envs: { RACK_ENV: 'dev' },
        },
        db: {
          image: "base",
          export_envs: { DB_URL: "#{envs.USER}:#{envs.PASSWORD}@#{net.host}:#{net.port.3666}" }
        }
      },
      defaultSystem: 'front',
      bins: [
        { name: "console", command: ["bundler", "exec"] }
      ]
    };

    it("should generate with a valid format", function() {
      var extra = _.merge({}, default_data, {
        systems: {
           front: { envs: { "F-O_O": "BAR"}, scalable: { default: 3}}
        }
      });

      var manifest = generate_manifest(dir, extra);
      var data = fs.readFileSync(manifest.file).toString();

      h.expect(data).to.match(/^\s{2}db: {$/m);
      h.expect(data).to.match(/^\s{6}RACK_ENV: "dev",$/m);
      h.expect(data).to.match(/^\s{6}'F-O_O': "BAR",$/m);
    });

    it("should expand image build steps", function() {
      var extra = _.merge({}, default_data, {
        systems: {
           front: { image: { build: [
             "run step 1",
             ["run", "step 2"],
           ] } }
        }
      });

      var manifest = generate_manifest(dir, extra);
      var data = fs.readFileSync(manifest.file).toString();

      h.expect(data).to.match(/^\s{2}db: {$/m);
      h.expect(data).to.match(/^\s{6}build: \[$/m);
      h.expect(data).to.match(/^\s{8}"run step 1",$/m);
      h.expect(data).to.match(/^\s{8}\["run"\, "step 2"\],$/m);
    });

    it("should generete a valid manifest file", function() {
      var manifest = generate_manifest(dir, default_data);
      var system   = manifest.systemDefault;
      var name     = path.basename(dir);

      h.expect(system).to.have.deep.property("name", "front");
      h.expect(system).to.have.deep.property("image.name", "base:0.1");
      h.expect(system).to.have.deep.property("depends").and.to.eql(["db"]);
      h.expect(system).to.have.deep.property("options.workdir", "/azk/" + name);
      h.expect(system).to.have.deep.property("options.scalable").and.ok;
      h.expect(system).to.have.deep.property("options.mount_folders")
        .and.to.eql({ ".": "/azk/" + name});
      h.expect(system).to.have.deep.property("options.command")
        .and.to.eql("bundle exec rackup config.ru");
    });

    it("should generate export envs", function() {
      var manifest = generate_manifest(dir, default_data);
      var system   = manifest.system('db');
      h.expect(system).to.have.deep.property("options.export_envs")
        .and.to.eql({ DB_URL: "#{envs.USER}:#{envs.PASSWORD}@#{net.host}:#{net.port.3666}" });
    });

    it("should support instances in scalable", function() {
      var data = _.merge({}, default_data, { systems: {
        front: {
          scalable: { default: 5 }
        }
      }});
      var manifest = generate_manifest(dir, data);
      var system   = manifest.systemDefault;

      h.expect(system).to.have.deep.property("options.scalable").and.eql({ default: 5});
    });
  });
});


