# A-Puzzle-A-Second

**Live Demo:** [cbrincoveanu.github.io/a-puzzle-a-second](https://cbrincoveanu.github.io/a-puzzle-a-second)

---

A web clock where the current time is represented by dynamically solved polyomino puzzles. Inspired by the classic [A-Puzzle-A-Day by DragonFjord](https://www.dragonfjord.com/product/a-puzzle-a-day/).

## How It Works

This webpage displays three separate puzzle boards for Hours, Minutes, and Seconds. Each board is filled with a set of polyomino pieces, leaving exactly one cell empty. The position of this empty cell on each board corresponds to the current hour, minute, or second.

Every second, the application:
1.  Determines the new target empty cell for each time unit.
2.  Retrieves a pre-computed solution for that configuration.
3.  Animates the puzzle pieces from their previous state to the new solved state.

## Features

*   **Live Time Display:** Shows current Hours, Minutes, and Seconds using three independent puzzles.
*   **Dynamic Solving:** Pieces rearrange to solve the puzzle for each new time value.
*   **Animated Transitions:** Puzzle pieces smoothly animate to their new positions and rotations.
*   **Pre-computation:** Most puzzle solutions are pre-computed on load for fast transitions, with a loading progress indicator.
*   **Responsive Design:** The display adapts to different screen sizes.
*   **"Numbers Under Pieces":** The numerical values for each cell are drawn on the board, with pieces appearing to cover them.

## Tech Stack

*   HTML5
*   CSS3
*   Vanilla JavaScript (ES6+)

## Running Locally

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/a-puzzle-a-second.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd a-puzzle-a-second
    ```
3.  Open the `index.html` file in your web browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
