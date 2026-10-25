# Voxnelo

**Practice English, one sentence at a time.**

**English** · [简体中文](README.zh-CN.md)

Voxnelo is an open-source, local-first desktop app for practicing spoken English. Listen to a short sentence, say it yourself, and play back your recording. No account is required.

**Source version:** `1.0.4` (unpublished candidate) · **Latest public release:** `v1.0.3` (unsigned, known limitations) · **Maintainer:** Leo Luo · **License:** [MIT](LICENSE)

## Core features

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

## Download & installation

**Official desktop editions are unsigned, not publisher-signed or Apple-notarized builds.** The [GitHub Releases (latest)](https://github.com/kunlong-luo/voxnelo/releases/latest) provides installers and independent SHA-256 manifests for **Linux, Windows and macOS**. Only use installers from the official releases page; hashes detect mismatched files but do not replace digital signatures.

| Platform | Installer | Important limits |
| --- | --- | --- |
| Linux x64 | `Voxnelo.deb` / `voxnelo_1.0.3_amd64.deb` (identical bytes); `Voxnelo-1.0.3.AppImage` | DEB for Debian/Ubuntu/Pop!_OS; AppImage requires suitable system libraries |
| Windows | NSIS `.exe` | **Unsigned**, so SmartScreen may warn; the currently published v1.0.3 has no Windows-native Moonshine |
| macOS | `.dmg` | **Unsigned and not notarized**; Gatekeeper may warn; check your Mac chip architecture and DMG compatibility |

Each platform also has a checksum file: `SHA256SUMS-linux.txt`, `SHA256SUMS-win32.txt` or `SHA256SUMS-darwin.txt`. On Linux, place the appropriate manifest beside the downloaded files and run `sha256sum -c SHA256SUMS-linux.txt`.

To upgrade on Debian-based Linux, download the new package, open `Voxnelo.deb` with your package manager or install the versioned file from its download directory:

```bash
sudo apt install ./Voxnelo.deb
```

Existing installations normally upgrade in place; you should not have to uninstall first. Windows/macOS installers are official **unsigned builds**, not evidence of device certification, publisher signing, Apple notarization or universal native ASR support. See the [user guide](docs/USER-GUIDE.md) and [release notes](docs/release-notes/v1.0.3.md).

## Speech recognition and privacy

**Linux desktop uses Moonshine Medium Streaming as the default offline English dictation engine.** Standard installers do not bundle the third-party native runtime or model: on Linux, open **Offline Models** and explicitly choose **Install Moonshine**. In the currently published v1.0.3, Windows and macOS provide desktop practice and microphone recording, but native Moonshine recognition is not supported. The upcoming v1.0.4 source adds explicitly user-installed offline Moonshine on Windows x64 and macOS 15+ Apple Silicon; model and SDK are never bundled. The app downloads the pinned SDK and model, checks model SHA-256 before use, then performs recognition locally. Initial setup requires internet, Python 3 with venv and sufficient disk space; supported CPU/OS depends on the app version (v1.0.3 public Linux x64; v1.0.4 candidate additionally Windows x64 and macOS 15+ ARM64). There is no silent Zipformer fallback, no automatic pronunciation scoring, and no word-by-word correction. Real-device noise/accuracy acceptance remains ongoing; see the [Moonshine installation guide](docs/engineering/MOONSHINE-LINUX-INSTALLATION.md).

Practice progress and favorites are stored on the device; there is no Voxnelo account or cross-device sync. Microphone recording requires your permission. Recordings are temporary for playback in the current sentence and are not uploaded by Voxnelo. If you try speech recognition in a web browser, browser-provided services can have different privacy and network behavior.

For the not-yet-released Windows x64 / macOS 15+ ARM64 native Moonshine pilot, see [cross-platform details](docs/engineering/MOONSHINE-CROSS-PLATFORM-PILOT.md). The published v1.0.3 installers do not contain this work.

## Development and support

Voxnelo uses Electron, React, TypeScript, Rsbuild, and local IndexedDB storage. For setup, testing, and packaging commands, see the [development guide](docs/DEVELOPMENT.md).

- [User guide](docs/USER-GUIDE.md)
- [Privacy information (still subject to independent review)](docs/PRIVACY.md)
- [Changelog](CHANGELOG.md)
- [Report a bug or suggest an improvement](https://github.com/kunlong-luo/voxnelo/issues)

Please remove personal information from public issue reports and do not upload private voice recordings.

> **Release scope:** This is an official unsigned desktop distribution. Windows/macOS may display security warnings or block it. In the public v1.0.3, offline speech recognition is opt-in on Linux only; the optional SDK and model are not bundled. Physical-device, content-rights and novice-user evidence remains incomplete in the repository; an official release does **not** assert external certification.
