#!/usr/bin/env bash
# Run on the Pi:  curl -fsSL https://babble.brenstrum.com/pi/setup.sh | bash
set -euo pipefail

URL="${BABBLE_CHAIR_URL:-https://babble.brenstrum.com/chair}"
AUTOSTART="${BABBLE_CHAIR_AUTOSTART:-yes}"
BIN="$HOME/.local/bin"
LABWC="$HOME/.config/labwc"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

BROWSER="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$BROWSER" ]; then
  say "Installing Chromium"
  sudo apt-get update
  sudo apt-get install -y chromium || sudo apt-get install -y chromium-browser
  BROWSER="$(command -v chromium || command -v chromium-browser)"
fi

say "Installing the chair launcher"
mkdir -p "$BIN"
cat > "$BIN/babble-chair" <<EOF
#!/usr/bin/env bash
BROWSER="$BROWSER"
URL="$URL"
PREFS="\$HOME/.config/\$(basename "\$BROWSER")/Default/Preferences"
rm -f "\$HOME/.babble-chair-off"
pkill -x "\$(basename "\$BROWSER")" 2>/dev/null || true
sleep 1
while [ ! -e "\$HOME/.babble-chair-off" ]; do
  # After a power cut Chromium thinks it crashed and offers to restore pages; mark the last exit as clean.
  [ -f "\$PREFS" ] && sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "\$PREFS"
  "\$BROWSER" --ozone-platform=wayland --disable-gpu --kiosk --noerrdialogs --disable-infobars \\
    --disable-session-crashed-bubble --password-store=basic --disk-cache-dir=/dev/shm/babble-chair "\$URL" \\
    > /tmp/babble-chair.log 2>&1
  sleep 3
done
EOF
cat > "$BIN/babble-chair-stop" <<EOF
#!/usr/bin/env bash
touch "\$HOME/.babble-chair-off"
pkill -x "\$(basename "$BROWSER")" 2>/dev/null || true
EOF
chmod +x "$BIN/babble-chair" "$BIN/babble-chair-stop"

say "Adding a desktop icon"
mkdir -p "$HOME/Desktop"
cat > "$HOME/Desktop/babble-chair.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=babble chair
Exec=$BIN/babble-chair
Icon=chromium
Terminal=false
EOF
chmod +x "$HOME/Desktop/babble-chair.desktop"
mkdir -p "$HOME/.config/libfm"
if [ -f "$HOME/.config/libfm/libfm.conf" ]; then
  sed -i 's/^quick_exec=.*/quick_exec=1/' "$HOME/.config/libfm/libfm.conf"
  grep -q '^quick_exec=' "$HOME/.config/libfm/libfm.conf" || sed -i 's/^\[config\]/[config]\nquick_exec=1/' "$HOME/.config/libfm/libfm.conf"
else
  printf '[config]\nquick_exec=1\n' > "$HOME/.config/libfm/libfm.conf"
fi

mkdir -p "$LABWC"
if [ ! -f "$LABWC/autostart" ] && [ -f /etc/xdg/labwc/autostart ]; then
  cp /etc/xdg/labwc/autostart "$LABWC/autostart"
fi
touch "$LABWC/autostart"
sed -i '/babble-chair\|chromium/d' "$LABWC/autostart"
if [ "$AUTOSTART" = "yes" ]; then
  say "Starting chair mode when the Pi boots"
  echo "sleep 10 && $BIN/babble-chair &" >> "$LABWC/autostart"
fi

if command -v raspi-config >/dev/null; then
  say "Setting the Pi to boot to the desktop and switch the screen off when idle"
  sudo raspi-config nonint do_boot_behaviour B4
  sudo raspi-config nonint do_blanking 0
fi

say "Cutting down SD card writes"
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nStorage=volatile\nRuntimeMaxUse=30M\n' | sudo tee /etc/systemd/journald.conf.d/babble-chair.conf >/dev/null
if systemctl list-unit-files dphys-swapfile.service >/dev/null 2>&1; then
  sudo systemctl disable --now dphys-swapfile.service >/dev/null 2>&1 || true
fi

say "Done."
echo "Reboot with: sudo reboot"
echo "Sign in once on the touchscreen, and it stays signed in after that."
echo "Stop chair mode over SSH with: babble-chair-stop"
echo "Start it again with the 'babble chair' desktop icon, or: babble-chair"
