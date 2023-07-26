# Development Environment

## JSON5 and Syntax Highlighting

This package uses `package.json5` instead of `package.json`, which REQUIRES [pnpm](https://pnpm.io/installation) for installing packages. This allows for in-line comments for configs.

<details>
<summary><b>If you're using VS Code, please do the following:</b></summary>

1. Once you've cloned the repository and opened it in VS Code, download the recommended extensions, but especially the JSON5 syntax extension (`mrmlnc.vscode-json5`).

    > If you're not given the prompt, or have dismissed them, click on the Extensions icon, then search for the JSON5 syntax extension, or with the ID.

1. Open `package.json5`. You should see that the syntax highlighting is a disaster.

1. Toggle the Command Palette (try `Ctrl+Shift+P`, or `F1`), then type and select "Change Language Mode", and select "Configure File Association for '.json5'..."

1. Once selected, `package.json5` formatting should be fixed.

    > Intellisense doesn't work in `.json5` files. A hacky workaround for this is to temporarily rename it back to `package.json`, view and edit what's needed, then rename it back to `package.json5`.

</details>

## Building from Scratch

These instructions are only for people looking to contribute to this tool. If you're looking for the app to download and run, check the [Releases](https://github.com/some1chan/obs-stream-sync/releases/)!

### Pre-requisites

To compile `obs-stream-sync`, you will need to download or install these pre-requisites with your favorite package manager:

-   [Git](https://git-scm.com/downloads)
-   [Node.js 18](https://nodejs.org/) (Untested with older versions)

### Instructions

Run the following commands in your terminal:

```bash
# Downloads the repo, and navigates inside it
git clone https://github.com/some1chan/obs-stream-sync.git
cd obs-stream-sync

# Installs pnpm, an alternative to npm
npm install -g pnpm

# Now install the dependencies, and build
pnpm install
pnpm build

# And you can now run it with the following command
pnpm start
```

If you're making changes to the code, and wish to try your changes, use `pnpm dev` for automatic reloading.
