local azk  = require('azk')
local os   = require('os')
local path = require('pl.path')

describe("azk", function()
  it("should return a azk root path", function()
    local root_path = path.abspath(os.getenv('AZK_PATH'))
    assert.are.equal(path.abspath(azk.root_path), root_path)
  end)
end)
