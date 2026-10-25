# Chair mode on a Raspberry Pi

A Raspberry Pi with a touchscreen makes a good always-on chair mode screen. The setup script is served by babble itself, so it survives a dead SD card.

## Setting up (or recovering after a new SD card)

1. Flash Raspberry Pi OS (with desktop) using Raspberry Pi Imager, on a card of 16 GB or more. The desktop and Chromium alone fill most of an 8 GB card, and Chromium warns about low storage and misbehaves once the card is full. In its OS customisation, set the hostname, your user, Wi-Fi and turn on SSH, so the Pi comes up ready without a keyboard.
2. On the Pi (over SSH or a terminal), run:

   ```
   curl -fsSL https://babble.brenstrum.com/pi/setup.sh | bash
   sudo reboot
   ```

3. Chair mode opens on a sign-in screen with a QR code. Scan it with a phone that's signed in to babble and tap **Sign in device**; the Pi signs in as you and stays signed in after that. No camera handy? Go to `/link` on the phone and type the code instead. Then name the Pi in **Settings → This device → Device name** (e.g. "Chair") so entries logged on it say so.

The script source is [`apps/web/public/pi/setup.sh`](../apps/web/public/pi/setup.sh). It's safe to run again.

## What the script does

- Installs Chromium if it's missing.
- Adds `~/.local/bin/babble-chair`, which opens `/chair` in Chromium's kiosk mode (`--kiosk`: full screen from the start, no address bar or window controls) with `--ozone-platform=wayland --disable-gpu` (the Pi's GPU drivers otherwise give a white screen), restarts Chromium if it exits or crashed after a power cut, and keeps Chromium's cache in memory. Before each start it deletes the metrics file and crash dumps Chromium leaves in its profile, which otherwise pile up with every restart, and it runs Chromium without the crash reporter.
- Adds `babble-chair-stop` and a **babble chair** desktop icon, and lets the desktop run it on a double tap without asking.
- Starts chair mode 10 seconds after the desktop loads (labwc autostart), replacing any older chromium line. Set `BABBLE_CHAIR_AUTOSTART=no` before running to skip this.
- Boots to the desktop with auto-login.
- Switches the display off after 30 minutes without a tap (a tap wakes it without pressing anything; chair mode keeps it on during a feed). The launcher adds `?screenOff=30` to the chair URL so chair mode knows to ignore that waking tap. It uses `swayidle` and `wlopm` in the labwc autostart instead of the Pi's built-in blanking, which is fixed at 10 minutes. Set `BABBLE_CHAIR_SCREEN_OFF_MINUTES` before running to change it, or `0` to never switch it off.
- Cuts SD card writes: system logs go to memory (and any logs the Pi kept on the card before are trimmed to 30 MB), swap is turned off, and Chromium's log is kept to errors and rotated by `logrotate` at 1 MB. Chair mode itself never stores the app's data cache on the device: the other pages keep a copy for offline use, but on `/chair` it's left off and any old copy is removed.

## Day to day

- Chair mode fills the screen from boot. Kiosk mode has no window controls; to get to the desktop, stop chair mode (below), or plug in a keyboard and press Alt+F4 (it restarts by itself after 3 seconds unless stopped).
- Already set up before kiosk mode? Run the setup command again and reboot to switch over.

- Stop chair mode: `ssh` in and run `babble-chair-stop`.
- Start it again: the **babble chair** desktop icon, or `babble-chair`.
- Chromium's log: `~/.local/state/babble-chair/chromium.log` (older setups wrote `/tmp/babble-chair.log`, which the script removes).
- Change the screen-off time: `curl -fsSL https://babble.brenstrum.com/pi/setup.sh | BABBLE_CHAIR_SCREEN_OFF_MINUTES=60 bash`, then reboot.
- Use a different server: `curl -fsSL https://babble.brenstrum.com/pi/setup.sh | BABBLE_CHAIR_URL=https://example.com/chair bash`.

## If the card fills up

Older versions of the script let two things grow without limit: Chromium's log, which it wrote to `/tmp/babble-chair.log` until Chromium restarted, and the files Chromium leaves in its profile on each start. Running the setup script again fixes both. To see what's taking the space:

```
df -h /
sudo du -xsh /* 2>/dev/null | sort -rh | head
sudo du -xsh /var/* /var/lib/* /var/cache/* 2>/dev/null | sort -rh | head
sudo find / -xdev -type f -size +50M -exec ls -lh {} + 2>/dev/null
sudo sh -c 'ls -l /proc/*/fd 2>/dev/null | grep deleted'
```

The last line finds files that were deleted while a program still had them open; the space only comes back once that program stops, so a reboot frees it.

`BrowserMetrics`, `Crash Reports` and the log are safe to delete at any time. Chromium's `Default` folder holds the sign-in, so leave that alone unless you're happy to scan the QR code again.

## Keeping the SD card alive

SD cards usually die from writes and from losing power mid-write. The script cuts the writes; beyond that, a good quality card (A1/A2 rated) or booting from a USB SSD helps most, as does shutting down with `sudo poweroff` rather than pulling the plug where you can. A fully read-only system (Raspberry Pi's overlay file system) isn't a good fit here, because babble would be signed out after every reboot.
