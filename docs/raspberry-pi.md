# Chair mode on a Raspberry Pi

A Raspberry Pi with a touchscreen makes a good always-on chair mode screen. The setup script is served by babble itself, so it survives a dead SD card.

## Setting up (or recovering after a new SD card)

1. Flash Raspberry Pi OS (with desktop) using Raspberry Pi Imager. In its OS customisation, set the hostname, your user, Wi-Fi and turn on SSH, so the Pi comes up ready without a keyboard.
2. On the Pi (over SSH or a terminal), run:

   ```
   curl -fsSL https://babble.brenstrum.com/pi/setup.sh | bash
   sudo reboot
   ```

3. Chair mode opens on a sign-in screen with a QR code. Scan it with a phone that's signed in to babble and tap **Sign in device**; the Pi signs in as you and stays signed in after that. No camera handy? Go to `/link` on the phone and type the code instead. Then name the Pi in **Settings → This device → Device name** (e.g. "Chair") so entries logged on it say so.

The script source is [`apps/web/public/pi/setup.sh`](../apps/web/public/pi/setup.sh). It's safe to run again.

## What the script does

- Installs Chromium if it's missing.
- Adds `~/.local/bin/babble-chair`, which opens `/chair` in Chromium's kiosk mode (`--kiosk`: full screen from the start, no address bar or window controls) with `--ozone-platform=wayland --disable-gpu` (the Pi's GPU drivers otherwise give a white screen), restarts Chromium if it exits or crashed after a power cut, and keeps Chromium's cache in memory.
- Adds `babble-chair-stop` and a **babble chair** desktop icon, and lets the desktop run it on a double tap without asking.
- Starts chair mode 10 seconds after the desktop loads (labwc autostart), replacing any older chromium line. Set `BABBLE_CHAIR_AUTOSTART=no` before running to skip this.
- Boots to the desktop with auto-login.
- Turns on the on-screen keyboard (squeekboard) and starts Chromium with Wayland text input, so the keyboard pops up when you tap a text field, e.g. the device name in chair mode's settings.
- Switches the display off after 30 minutes without a tap (a tap wakes it without pressing anything; chair mode keeps it on during a feed). The launcher adds `?screenOff=30` to the chair URL so chair mode knows to ignore that waking tap. It uses `swayidle` and `wlopm` in the labwc autostart instead of the Pi's built-in blanking, which is fixed at 10 minutes. Set `BABBLE_CHAIR_SCREEN_OFF_MINUTES` before running to change it, or `0` to never switch it off.
- Cuts SD card writes: system logs go to memory and swap is turned off.

## Day to day

- Chair mode fills the screen from boot. Kiosk mode has no window controls; to get to the desktop, stop chair mode (below), or plug in a keyboard and press Alt+F4 (it restarts by itself after 3 seconds unless stopped).
- Already set up before kiosk mode? Run the setup command again and reboot to switch over.

- Stop chair mode: `ssh` in and run `babble-chair-stop`.
- Start it again: the **babble chair** desktop icon, or `babble-chair`.
- Chromium's log: `/tmp/babble-chair.log`.
- Change the screen-off time: `curl -fsSL https://babble.brenstrum.com/pi/setup.sh | BABBLE_CHAIR_SCREEN_OFF_MINUTES=60 bash`, then reboot.
- Use a different server: `curl -fsSL https://babble.brenstrum.com/pi/setup.sh | BABBLE_CHAIR_URL=https://example.com/chair bash`.

## Keeping the SD card alive

SD cards usually die from writes and from losing power mid-write. The script cuts the writes; beyond that, a good quality card (A1/A2 rated) or booting from a USB SSD helps most, as does shutting down with `sudo poweroff` rather than pulling the plug where you can. A fully read-only system (Raspberry Pi's overlay file system) isn't a good fit here, because babble would be signed out after every reboot.
