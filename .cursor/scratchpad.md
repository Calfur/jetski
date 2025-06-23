# Development Scratchpad

## Requirements
- Shared multi player game view (2d horizontal 16:9 fixed size water area, responsive, as big as fits on the screen with dark surroundings), stored server side in memory, displayed on jetski.calfur.dev/view
- This view will be displayed with a beamer and be view only
- Ability to enter player name and join onto the game view (as colored rectangle (jetski) with player name tag above)
- This view will be used by players on their phone.
- Game controller view (2 big buttons which each fill half of the screen for left and right jetski motor in the colors of the players jetski), displayed on jetski.calfur.dev/controller
- Inactive players get kicked after 1min inactivity (no steering requests) based on socket timeout
- Prevent duplicated name inputs over all active players, they have to be unique. The scoreboard does not have to be considered.
- Responsive landing page
  - Title "Jetski"
  - Subtitle "Vibe Code Challenge For All - Online.ch Palermo"
  - with links (displayed as big cards) to the other two pages:
    - "Game view"
      - Subtitle "View only"
      - Beamer / Screen icon
      - Description "Open this on a big screen to display the map"
    - "Controller view"
      - Subtitle "Input only"
      - Phone / Gamepad icon
      - Description "Use this on your phone to control your jetski"
- Things to collect to get points on collision, which respawn randomly, limited total amount
- Scoreboard on view page
- Jetski physics (drifting, hard to stop moving)
- `Online` company logo as obstacle, death on collision
- Random spawnpoint outside of obstacles
- Death on collisions of two players
- Explosions on collision

## Tech stack
- Typescript
- Tailwind
- Next.js
- Phaser
- Websocket

## TODOs
- [x] Create hello world app
- [x] Setup GitHub Action which creates dockerimage & triggers deployment on calfur-dev
- [x] Create 2 sub pages (game view & game controller)
- [x] Add links to sub pages
- [x] Setup basic game view with Phaser (water area)
- [ ] Multiplayer ability, joining with devices as game controllers adds player names to game view
- [ ] Add player jetski model (colored rectangle with name tag)
- [ ] Implement basic player movement (left/right controls)
- [ ] Create collectible items (random spawn, limited amount)
- [ ] Implement collision detection for collectibles
- [ ] Add score tracking and display scoreboard
- [ ] Implement jetski physics (drifting, momentum)
- [ ] Add Online logo obstacle
- [ ] Implement player-player collision detection
- [ ] Add player spawn system (random position outside obstacles)
- [ ] Add death handling (respawn, score reset)
- [ ] Add explosion effects on collisions
- [ ] Polish game view (water effects, jetskis, UX)
- [ ] Add game instructions/help
