# Stream TV

<img width="1919" height="1032" alt="Screenshot 2026-04-15 170644" src="https://github.com/user-attachments/assets/7580f2c5-a5db-4f3b-8b5e-38861de55ac6" />

<img width="1919" height="1078" alt="image" src="https://github.com/user-attachments/assets/f72912d7-8e4e-4168-9458-6d1aac56a1df" />

Electron desktop player built from the `electron-vite-react` starter and adapted for HLS playback with `hls.js`.

## Stack

- Electron for the desktop shell
- Vite for development and builds
- React for the renderer UI
- HLS.js for `.m3u8` playback
- Zustand for global state and persisted renderer settings
- Xtream API login and library browsing for live, VOD, and series catalogs
- TanStack Router for screen navigation
- TanStack Query for Xtream data loading and caching

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
