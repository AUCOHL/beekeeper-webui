# Dependencies
In the process of figuring them out in a fresh environment. There are many :( apparently a bad programmer is at work here

## Beekeeper
A working version of Beekeeper is required. Place inside the project directory.
All dependencies required for Beekeeper must be met.

## dos2unix
	sudo apt install dos2unix

Note: This is driving me nuts, I used to like perl before this.
## socket.io
	npm install -g socket.io

# Usage
Must place the project root under /home/$USER/bin/
For branch old-version use Beekeeper commit fa480a2
For branch master use latest version of Beekeeper

	$ cd <project-root-directory>
	$ node socket.js
	$ cd public

Open Index.html in public folder, that's it, go ahead.

# Functionality

Note: Single click is at work here. It's working in the background there's just no loading screen, will add.

## Not working
	Single stepping. This requires a node wrapper for Beekeeper IO.
	RISC-V, this is an easy one just a mode select, super fast to implement.

# Future
	Implement single stepping
	Add loading spinner for buttons
	Add RISC-V code to socket
	Add Beekeeper as submodule
	Restructure to separate public and project
	Implement auto syntax detection for C and RISC so the user doesn't have to choose.
