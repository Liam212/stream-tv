# Stream TV

Electron desktop player built from the `electron-vite-react` starter and adapted for HLS playback with `hls.js`.

## Stack

- Electron for the desktop shell
- Vite for development and builds
- React for the renderer UI
- HLS.js for `.m3u8` playback
- Xtream API login and library browsing for live, VOD, and series catalogs

## Run

```sh
npm install
npm run dev
```

The player boots with a public sample manifest:

```txt
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
```

Replace it with any reachable HLS manifest and click `Load stream`.

## Xtream API

The app can connect to a provider that exposes the common Xtream `player_api.php` endpoints.

Enter:

- Server URL, for example `http://provider.example:8080`
- Username
- Password
- Preferred live output (`m3u8` or `ts`)

After connecting, the app will browse live, VOD, and series categories and load playable items into the desktop player.

## Build

```sh
npm run build
```
