# Rename all instances of example to your function name. Be sure to update main.c, too.
    .option nopic
    .text
    .align   2
    .globl   example
    .type    example, @function
example:
    li t0, 4096
    lhu s0, 0(t0)
    slli s0, s0, 1
    sh s0, 0(t0)
    jr    ra
    .size    example, .-example
