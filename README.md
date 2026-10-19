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

**0.1.5 is a test build, not a stable public release.** There is no published GitHub Release for this version yet. For evaluation builds, open the [CI workflow runs](https://github.com/kunlong-luo/voxnelo/actions/workflows/ci.yml?query=branch%3Amain), choose a successful run on `main`, and check its downloadable artifacts. Artifacts may require a GitHub sign-in and expire.

| Platform | Current packaging |
| --- | --- |
| Linux (x64) | Test `.deb` and `.AppImage` builds. The Linux CI artifact includes `Voxnelo.deb` and `voxnelo_0.1.5_amd64.deb` (identical package contents). |
| Windows | Unsigned NSIS test installer; not yet available as a public Release download. |
| macOS | Unsigned/unnotarized DMG test installer; not yet available as a public Release download. |

For Debian-based Linux systems, extract the CI artifact first. You can open `Voxnelo.deb` in a package installer, or install the versioned package from its directory:

```bash
sudo apt install ./voxnelo_0.1.5_amd64.deb
```

An existing installation can be upgraded without uninstalling it first. See the [installation and candidate-testing guide](docs/engineering/V0.1-RC-PLAYBOOK.md) for platform-specific checks. The [Releases page](https://github.com/kunlong-luo/voxnelo/releases) will list published downloads when they are available.

## Speech recognition and privacy

**Live dictation is experimental, not an out-of-the-box desktop feature.** Standard desktop packages do **not** bundle a third-party offline speech-recognition engine or model. A separately configured, opt-in [Linux personal ASR pilot](docs/engineering/LOCAL-ASR-PERSONAL-PILOT.md) exists, but its real-device accuracy and noise handling have not passed release acceptance. There is **no automatic pronunciation score or word-by-word correction**.

Practice progress and favorites are stored on the device; there is no Voxnelo account or cross-device sync. Microphone recording requires your permission. Recordings are temporary for playback in the current sentence and are not uploaded by Voxnelo. If you try speech recognition in a web browser, browser-provided services can have different privacy and network behavior.

## Development and support

Voxnelo uses Electron, React, TypeScript, Rsbuild, and local IndexedDB storage. For setup, testing, and packaging commands, see the [development guide](docs/DEVELOPMENT.md).

- [User guide](docs/USER-GUIDE.md)
- [Privacy information (pending release review)](docs/PRIVACY.md)
- [Changelog](CHANGELOG.md)
- [Report a bug or suggest an improvement](https://github.com/kunlong-luo/voxnelo/issues)

Please remove personal information from public issue reports and do not upload private voice recordings.

> **Release status:** Automated checks do not replace real-device microphone testing, content review, or redistribution-rights verification. Those release checks remain in progress.
