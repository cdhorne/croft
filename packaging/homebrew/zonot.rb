# Homebrew formula for the Zonot CLI standalone binary (ADR-0023).
# Maintained in a tap (e.g. cdhorne/homebrew-tap); the release workflow updates
# `version` and the four `sha256` values from dist/checksums.txt on each tag.
class Zonot < Formula
  desc "Calm capture, deep notes, plain Markdown in your own GitHub repo"
  homepage "https://github.com/cdhorne/zonot"
  version "0.0.0"
  license "FSL-1.1-ALv2"

  on_macos do
    on_arm do
      url "https://github.com/cdhorne/zonot/releases/download/v#{version}/zonot-darwin-arm64"
      sha256 "REPLACE_DARWIN_ARM64"
    end
    on_intel do
      url "https://github.com/cdhorne/zonot/releases/download/v#{version}/zonot-darwin-x64"
      sha256 "REPLACE_DARWIN_X64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/cdhorne/zonot/releases/download/v#{version}/zonot-linux-arm64"
      sha256 "REPLACE_LINUX_ARM64"
    end
    on_intel do
      url "https://github.com/cdhorne/zonot/releases/download/v#{version}/zonot-linux-x64"
      sha256 "REPLACE_LINUX_X64"
    end
  end

  def install
    bin.install Dir["zonot-*"].first => "zonot"
  end

  test do
    assert_match "zonot", shell_output("#{bin}/zonot --version")
  end
end
