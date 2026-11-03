# WhisperWood Demo Recording Script / Demo Video Script

## Preparation

1. Open Chrome browser (latest version recommended)
2. Close all unnecessary tabs and applications (Teams, Zoom, etc.)
3. Ensure adequate lighting on your face and hands (ceiling light or window-facing is ideal, avoid strong backlight)
4. Start a local HTTP server in the source directory:
   ```
   cd whisperwood
   python -m http.server 8000
   ```
5. Open `http://localhost:8000` in Chrome
6. Prepare screen recording software (OBS Studio recommended, or Win+Alt+R for Xbox Game Bar)
7. Position yourself 30-60cm from the webcam so your hand is clearly visible
8. TEST first: quickly go through one round to verify gesture recognition works in current lighting

## Recording Script (~4 minutes total)

### Scene 1: Opening & Atmosphere (00:00 - 00:30)

**Narration:**
"WhisperWood -- Whispering Forest -- is an AI-driven dark fairytale gesture duel game. You play as a young wizard in a dark forest, using hand gestures to cast spells against a Dark Lord that observes you, analyzes your weaknesses, and targets them."

**Actions:**
- Show the landing page
- Point out the dark forest atmosphere, the wizard character, the tagline
- Read the quote: 'Within the deep mist, dead branches weave into a cage. That whisper is not the wind -- He is waiting for you to make a mistake.'

---

### Scene 2: Camera Setup (00:30 - 00:50)

**Narration:**
"No installation, no registration, no hardware. Just open a browser, grant camera permission, and you are in."

**Actions:**
- Click "Step into the Thorns"
- On the camera page, point out the eerie design
- Click "Allow the Gaze"
- Allow camera permission in browser dialog
- Camera preview appears -- wave your hand to show it is working
- Page auto-transitions to level select after 2 seconds

---

### Scene 3: Level Selection (00:50 - 01:10)

**Narration:**
"The game features 5 levels with progressive difficulty. Level 1 is basic gesture following. Level 2 adds mirror mechanics. Level 3 adds counter moves. Level 4 adds chain penalties. The Boss level enables all three mechanics simultaneously."

**Actions:**
- Briefly scroll through the level selector dropdown to show all 5 levels
- Point out the level info card (target score, time limit, mechanics)
- Select Level 1 "First Mist"
- Click "Step into the Curse"
- Wait for the 3-2-1 countdown to complete

---

### Scene 4: Basic Gameplay (01:10 - 02:00)

**Narration:**
"There are 6 gesture spells total. Three static: fist for Sealing, open palm for Dispelling, thumb-up for Guarding. Three motion: draw a circle for Barrier, swipe left for Rending, swipe up for Lifting. The game tells you which spell to cast, and a curse approaches. Cast the right gesture in time to break it."

**Actions:**
- Play the first few waves normally
- Demonstrate fist (clench hand) -- show the rune seal explosion
- Demonstrate palm (open hand) -- show the dispel effect
- Demonstrate thumb-up -- show the guard effect
- Show the HUD: health roses, score progress bar, level timer, combo counter
- Show the camera mirror window (bottom right)
- Point out the particle effects and magic trail on the canvas

---

### Scene 5: THE KEY MOMENT -- AI Targeting (02:00 - 03:00)

**THIS IS THE MOST IMPORTANT PART OF THE DEMO**

**Narration:**
"Here is what makes WhisperWood different. The AI Dark Lord is watching you. It tracks your success rate for each gesture. Now watch what happens when I deliberately fail the 'fist' gesture repeatedly..."

**Actions:**
- DELIBERATELY FAIL the fist gesture (e.g., show open palm when fist is asked)
- Fail fist 3-4 times in a row
- Observe how the "Bone Briar" curse (which requires fist) starts appearing more and more frequently

**Narration (during the above):**
"...See? The Dark Lord noticed that I repeatedly fail at fist sealing. And now -- look -- the Bone Briar curse keeps coming. It is TARGETING my weakness. This is not a random reaction game. This is an AI that observes, analyzes, and exploits your weak points."

**Actions:**
- Continue playing, now doing gestures correctly
- Build up a combo

**Narration:**
"Even more nuanced: when you build up a high combo, the AI shifts to 'Suppress' mode -- attacks speed up and become more aggressive. When your health is critically low, it shifts to 'Mercy' and gives you a chance. This four-tier attack state machine -- Probe, Suppress, Finish, Mercy -- makes every match feel like a real duel."

---

### Scene 6: Blind Mist / Boss Gaze (03:00 - 03:30)

**Narration:**
"Every 10 seconds, the Dark Lord opens its eyes for 3 seconds. This is the 'Blind Mist' mechanic. The screen is covered in fog -- you cannot see the gesture prompt. You must keep your hand COMPLETELY still. Any movement, and you are punished."

**Actions:**
- Wait for a Boss gaze cycle (the demon eye appears)
- Keep your hand still during the gaze
- Show the crimson demon eye SVG overlay
- Point out the heartbeat SFX

**Narration:**
"This is not a reaction test. This is a RESTRAINT test. Stay still -- but your heart races. One wrong move, and you feel the consequence. This reverse psychology is what makes it memorable."

---

### Scene 7: Level 2 -- Mirror Mechanic (03:30 - 03:55)

**Narration:**
"Now let me show Level 2 'Mirror Maze'. This adds the Mirror mechanic: the game shows you one gesture, but you must perform its OPPOSITE. If you see 'fist', you cast 'palm'. If you see 'palm', you cast 'fist'. This forces you to override your instinct, creating cognitive tension."

**Actions:**
- Navigate to Level 2
- Play a few waves showing the mirror mechanic
- Point out the mirror curse indicator at the top
- Deliberately fail once to show the failure punishment FX (demon eye, screen shake)
- Then recover correctly to show the mirror reversal working

---

### Scene 8: Result & Closing (03:55 - 04:15)

**Narration:**
"After the game ends, you see a detailed breakdown: waves survived, total score, maximum combo, and your weakest spell. The AI evaluates your performance and generates a personalized taunt."

**Actions:**
- Let time run out or health deplete to reach result screen
- Show the three stat cards (waves, score, combo)
- Show the "most cursed technique" section
- Show the quote line

**Narration:**
"To summarize: WhisperWood is zero hardware, pure browser, with three layers of AI -- gesture recognition, opponent decision-making, and narrative generation. It is not about clearing levels. It is about dueling a dark consciousness that thinks."

**End shot:** Landing page or logo screen

---

## Post-Recording

1. Review the recording for audio quality (ensure narration is clear)
2. Trim any long pauses or accidental blank screens
3. Save/export as MP4 (H.264, 1080p or 720p)
4. File name: `demo.mp4`
5. Place in the `product/` directory

## Quick Reference: Gestures

| Gesture | Hand Movement | Spell Name |
|---------|--------------|------------|
| Fist | Clench all fingers into a tight fist | Sealing Spell |
| Palm | Spread all five fingers wide open | Dispelling Spell |
| Thumb | Thumb clearly pointing up, other fingers curled | Guard Spell |
| Circle | Draw a full circle with your palm in the air | Barrier Spell |
| Swipe Left | Sweep palm horizontally to the left | Rending Spell |
| Swipe Up | Sweep palm vertically upward | Lifting Spell |
