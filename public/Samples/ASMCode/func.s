# Rename all instances of example to your function name. Be sure to update main.c, too.
    .option nopic
    .text
    .align   2
    .globl   example
    .type    example, @function
example:
    # Your assembly code here
    jr    ra
    .size    example, .-example
