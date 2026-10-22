# Voxnelo

**Practice English, one sentence at a time.**

**English** · [简体中文](README.zh-CN.md)

Voxnelo is an open-source, local-first desktop app for practicing spoken English. Listen to a short sentence, say it yourself, and play back your recording. No account is required.

**Current version:** `0.1.5` · **Stage:** Early Access (testing) · **Maintainer:** Leo Luo · **License:** [MIT](LICENSE)

## What works in 0.1.5

- **40 English sentences** with Chinese translations, topics, difficulty levels, and optional IPA pronunciation guides.
- **Listen and repeat:** play a sentence using your system's English text-to-speech voice; switch between normal and slow playback.
- **Record and listen back:** grant microphone access, record your own attempt, stop, and replay it during the current practice session.
- **Practice at your pace:** move between sentences or find one through the searchable, topic-filtered catalog.
- **Pick up where you left off:** review local practice history, favorite sentences, and mark sentences for review. Viewing a sentence is not counted as a recording attempt.
- **Make the interface yours:** switch between English and Chinese, Nordic and Sunset themes, IPA visibility, and reduced motion.

## How to use it

1. Open **Practice** and play the example sentence.
2. Select the recording control, allow microphone access, speak, and stop to listen back.
3. Move to another sentence, or use **Favorites**, **History**, or **Review** to revisit it.

The example voice is **system text-to-speech (TTS)**, not a professionally recorded native-speaker voice. Availability and offline playback depend on your operating system and installed voices.

## Installation and testing

**v0.1.5 Linux Early Access is an unsigned public preview, not a stable cross-platform release.** Get verified Linux x64 `.deb`, `.AppImage` and `SHA256SUMS-linux.txt` files from [GitHub Releases](https://github.com/kunlong-luo/voxnelo/releases) when the v0.1.5 prerelease is published. If it has not appeared, the [main CI artifacts](https://github.com/kunlong-luo/voxnelo/actions/workflows/ci.yml?query=branch%3Amain) remain test-only downloads.

| Platform | Current packaging |
| --- | --- |
| Linux (x64) | Early Access `.deb` and `.AppImage` candidates; friendly `Voxnelo.deb` and `voxnelo_0.1.5_amd64.deb` have identical contents. |
| Windows | Unsigned NSIS **CI test installer only**; not yet a public Release download. |
| macOS | Unsigned/unnotarized DMG **CI test installer only**; not yet a public Release download. |

For Debian-based Linux systems, download a DEB from the release, open `Voxnelo.deb` in your package manager, or install the versioned package from its directory:

```bash
sudo apt install ./voxnelo_0.1.5_amd64.deb
```

An existing installation can be upgraded without uninstalling it first. See the [installation and candidate-testing guide](docs/engineering/V0.1-RC-PLAYBOOK.md) for platform-specific checks. The [Releases page](https://github.com/kunlong-luo/voxnelo/releases) will list published downloads when they are available.

## Speech recognition and privacy

**Linux Early Access uses Moonshine Medium Streaming as the default offline English dictation engine.** Standard installers do not bundle the third-party native runtime or model: on first use, open **Offline Models** and explicitly choose **Install Moonshine**. The app downloads the pinned SDK and model, checks model SHA-256 before use, then performs recognition locally. Initial setup requires internet, Python 3 with venv and Linux x64. There is no silent Zipformer fallback, no automatic pronunciation scoring, and no word-by-word correction. Real-device noise/accuracy acceptance remains ongoing; see the [Moonshine installation guide](docs/engineering/MOONSHINE-LINUX-INSTALLATION.md).

Practice progress and favorites are stored on the device; there is no Voxnelo account or cross-device sync. Microphone recording requires your permission. Recordings are temporary for playback in the current sentence and are not uploaded by Voxnelo. If you try speech recognition in a web browser, browser-provided services can have different privacy and network behavior.

## Development and support

Voxnelo uses Electron, React, TypeScript, Rsbuild, and local IndexedDB storage. For setup, testing, and packaging commands, see the [development guide](docs/DEVELOPMENT.md).

- [User guide](docs/USER-GUIDE.md)
- [Privacy information (pending release review)](docs/PRIVACY.md)
- [Changelog](CHANGELOG.md)
- [Report a bug or suggest an improvement](https://github.com/kunlong-luo/voxnelo/issues)

Please remove personal information from public issue reports and do not upload private voice recordings.

> **Release status:** Linux Early Access is a public preview only. Automated checks and initial user testing do not certify all devices, course-content review, native redistribution rights, or unsigned package authenticity. The stable release gates remain open.
