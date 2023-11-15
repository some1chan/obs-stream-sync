# Development Environment

## Building from Scratch

These instructions are only for people looking to contribute to this tool. If you're looking for the app to download and run, check the [Releases](https://github.com/some1chan/obs-stream-sync/releases/)!

### Pre-requisites

To compile `obs-stream-sync`, you will need to download or install these pre-requisites with your favorite package manager:

-   [Git](https://git-scm.com/downloads)
-   [Node.js 18](https://nodejs.org/) (Untested with other versions)

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
