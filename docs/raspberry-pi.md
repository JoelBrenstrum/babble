# Chair mode on a Raspberry Pi

A Raspberry Pi with a touchscreen makes a good always-on chair mode screen. The setup script is served by babble itself, so it survives a dead SD card.

## Setting up (or recovering after a new SD card)

1. Flash Raspberry Pi OS (with desktop) using Raspberry Pi Imager. In its OS customisation, set the hostname, your user, Wi-Fi and turn on SSH, so the Pi comes up ready without a keyboard.
2. On the Pi (over SSH or a terminal), run:

   ```
   curl -fsSL https://babble.brenstrum.com/pi/setup.sh | bash
   sudo reboot
   ```

3. Sign in once on the touchscreen. It stays signed in after that.

The script source is [`apps/web/public/pi/setup.sh`](../apps/web/public/pi/setup.sh). It's safe to run again.

## What the script does

- Installs Chromium if it's missing.
- Adds `~/.local/bin/babble-chair`, which opens `/chair` as a maximised app window (`--app`, no address bar) with `--ozone-platform=wayland --disable-gpu` (the Pi's GPU drivers otherwise give a white screen), restarts Chromium if it exits or crashed after a power cut, and keeps Chromium's cache in memory.
- Adds `babble-chair-stop` and a **babble chair** desktop icon, and lets the desktop run it on a double tap without asking.
- Starts chair mode 10 seconds after the desktop loads (labwc autostart), replacing any older chromium line. Set `BABBLE_CHAIR_AUTOSTART=no` before running to skip this.
- Boots to the desktop with auto-login.
- Switches the display off after 30 minutes without a tap (a tap wakes it; chair mode keeps it on during a feed). It uses `swayidle` and `wlopm` in the labwc autostart instead of the Pi's built-in blanking, which is fixed at 10 minutes. Set `BABBLE_CHAIR_SCREEN_OFF_MINUTES` before running to change it, or `0` to never switch it off.
- Cuts SD card writes: system logs go to memory and swap is turned off.

## Day to day

- Chair mode goes full screen on the first tap (browsers only allow full screen after a tap). **Exit full screen** in its top strip drops back to a normal window for debugging, and **Full screen** goes back; the choice is remembered on the Pi.

- Stop chair mode: `ssh` in and run `babble-chair-stop`.
- Start it again: the **babble chair** desktop icon, or `babble-chair`.
- Chromium's log: `/tmp/babble-chair.log`.
- Change the screen-off time: `curl -fsSL https://babble.brenstrum.com/pi/setup.sh | BABBLE_CHAIR_SCREEN_OFF_MINUTES=60 bash`, then reboot.
- Use a different server: `curl -fsSL https://babble.brenstrum.com/pi/setup.sh | BABBLE_CHAIR_URL=https://example.com/chair bash`.

## Keeping the SD card alive

SD cards usually die from writes and from losing power mid-write. The script cuts the writes; beyond that, a good quality card (A1/A2 rated) or booting from a USB SSD helps most, as does shutting down with `sudo poweroff` rather than pulling the plug where you can. A fully read-only system (Raspberry Pi's overlay file system) isn't a good fit here, because babble would be signed out after every reboot.
