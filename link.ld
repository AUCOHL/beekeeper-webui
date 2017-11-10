
ENTRY(_start)

MEMORY
{
    ram :
        ORIGIN = 0,
        LENGTH = 4096
}

SECTIONS
 {
 . = ORIGIN(ram);
 
 /* text: test code section */
 .text :
 {
    *(.text)
 } > ram
 
 /* data: Initialized data segment */
 .data :
 {
    *(.data)
 } > ram
 
 /* Uintialized data */
  .bss :
  {
    *(.bss)
  } > ram
 /* End of uninitalized data segement */
 _end = .;
 }

PROVIDE(_fstack = ORIGIN(ram) + LENGTH(ram));

