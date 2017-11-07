void function()
{
    int a = 42;
    return;
}

int main()
{
    int a = 4;
    int b = 3;
    sample:
    a = b << 2;
    b = a + b;
    function();
    return 0;
}
