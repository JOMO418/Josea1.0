# Sound Files for POS Notifications

This directory contains sound effects that play alongside toast notifications for a richer user experience.

## Required Sound Files

Place the following MP3 files in this directory:

### 1. `login-success.mp3` 🔐
- **Trigger**: When user successfully authenticates and logs in
- **Recommended**: Professional tone or chime (0.5-1 second)
- **Example**: System startup sound, access granted beep, or welcome chime
- **Volume**: Pre-set to 30% (0.3) for subtle feedback

### 2. `success.mp3`
- **Trigger**: When a sale is successfully completed (201 Created response)
- **Recommended**: Pleasant chime or bell sound (0.5-1 second)
- **Example**: Cash register "cha-ching" or success bell

### 3. `error.mp3`
- **Trigger**: When API calls fail or validation errors occur
- **Recommended**: Gentle error tone (0.3-0.5 seconds)
- **Example**: Low beep or alert sound

### 4. `info.mp3`
- **Trigger**: When items are added to cart
- **Recommended**: Subtle click or pop sound (0.2-0.3 seconds)
- **Example**: Soft click or notification pop

### 5. `warning.mp3`
- **Trigger**: When stock limits are reached or user actions are blocked
- **Recommended**: Gentle warning tone (0.3-0.5 seconds)
- **Example**: Medium-pitched beep or alert

## Sound File Specifications

- **Format**: MP3
- **Volume**: Pre-normalized (sound will play at 50% volume)
- **Duration**: Keep sounds short (< 1 second) for quick feedback
- **Bitrate**: 128kbps recommended for web delivery
- **Sample Rate**: 44.1kHz standard

## Free Sound Resources

You can download free sound effects from:
- **Freesound.org** - Community-uploaded sounds (CC licensed)
- **Zapsplat.com** - Free sound effects library
- **SoundBible.com** - Royalty-free sound clips
- **Mixkit.co** - Free sound effects

## Testing Sounds

1. Place MP3 files in this directory
2. Restart the dev server (`npm run dev`)
3. Test notifications:
   - **Login to system** → `login-success.mp3`
   - Add item to cart → `info.mp3`
   - Complete a sale → `success.mp3`
   - Trigger API error → `error.mp3`
   - Exceed stock → `warning.mp3`

## Disabling Sounds

To disable sounds globally, edit `client/src/utils/notification.ts` and set the default `sound` option to `false`.

---

**Note**: Sounds are optional. The system will gracefully handle missing sound files and continue to display toast notifications without audio.
