# Dependencies
Install all listed items.
## node
    https://nodejs.org/en/download/package-manager/
## Verilog-VCD
You will need to make and install Verilog::VCD, there's no way around this it's required by vcd2js.
    https://metacpan.org/release/Verilog-VCD
## Program Dependencies
    sudo apt install iverilog dos2unix npm
## Module Dependencies
    npm install -g socket.io node-getopt
## Beekeeper
All dependencies required for Beekeeper must be met.
A working Installation of Beekeeper must be installed in /usr/local/bin.
Warning: When choosing Beekeeper installation directory don't place a trailing slash at the end of path.

# Usage
	cd <project-root-directory>
	node socket.js

Open Index.html in folder public, that's it, go ahead.

# Functionality

Note: Single click is at work here. It's working in the background there's just no loading screen, will add.

# Not working
    Nothing right now.
# Future
	Add loading spinner.
	Implement auto syntax detection for C and RISC.
    Multiple source files and tabs.
