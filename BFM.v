
/*
 * Cloud V SoC Generator
 * Generated on Wed Jan 17 2018 02:03:58 GMT+0200 (EET).
 */


`timescale 1ps/1ps

`include "BFM/MultiBee.v"
`include "BFM/InstantRAM.v"
`include "Cloud-V/GPIOSet.v"


module Bus;

reg clk, rst;

localparam width = 32;
localparam bytes = 4;

wire AWVALID;
wire AWREADY;
wire [width - 1: 0] AWADDR;
wire [2: 0] AWPROT;

//Write Data
wire WVALID;
wire WREADY;
wire [width - 1: 0] WDATA;
wire [bytes - 1: 0] WSTRB;

//Write Response
wire BVALID;
wire BREADY;
wire [1: 0] BRESP;

//Read Address Channel
wire ARVALID;
wire ARREADY;
wire [width - 1: 0] ARADDR;
wire [2: 0] ARPROT;

//Read Data Channel
wire RVALID;
wire RREADY;
wire [width - 1: 0] RDATA;
wire [1: 0] RRESP;

always begin
    #1 clk = !clk;
end

reg AWVALID_Main; reg ARVALID_Main;
reg AWVALID_GPIO_0; reg ARVALID_GPIO_0;

always @(*) begin

AWVALID_Main <= (AWVALID  && (AWADDR >= 0 && AWADDR < 4096)) ? 1 : 0;
ARVALID_Main <= (ARVALID  && (ARADDR >= 0 && ARADDR < 4096)) ? 1 : 0;

AWVALID_GPIO_0 <= (AWVALID  && (AWADDR >= 4096 && AWADDR < 4104)) ? 1 : 0;
ARVALID_GPIO_0 <= (ARVALID  && (ARADDR >= 4096 && ARADDR < 4104)) ? 1 : 0;

end

MultiBee RISCVCore (.ACLK(clk), .ARESETn(rst), .AWVALID(AWVALID), .AWADDR(AWADDR), .AWPROT(AWPROT), .AWREADY(AWREADY), .WVALID(WVALID), .WDATA(WDATA), .WSTRB(WSTRB), .WREADY(WREADY), .BREADY(BREADY), .BVALID(BVALID), .BRESP(BRESP), .ARVALID(ARVALID), .ARADDR(ARADDR), .ARPROT(ARPROT), .ARREADY(ARREADY), .RREADY(RREADY), .RVALID(RVALID), .RDATA(RDATA), .RRESP(RRESP));

InstantRAM Main (.ACLK(clk), .ARESETn(rst), .AWVALID(AWVALID_Main), .AWADDR(AWADDR), .AWPROT(AWPROT), .AWREADY(AWREADY), .WVALID(WVALID), .WDATA(WDATA), .WSTRB(WSTRB), .WREADY(WREADY), .BREADY(BREADY), .BVALID(BVALID), .BRESP(BRESP), .ARVALID(ARVALID_Main), .ARADDR(ARADDR), .ARPROT(ARPROT), .ARREADY(ARREADY), .RREADY(RREADY), .RVALID(RVALID), .RDATA(RDATA), .RRESP(RRESP));

GPIOSet GPIO_0 (.ACLK(clk), .ARESETn(rst), .AWVALID(AWVALID_GPIO_0), .AWADDR(AWADDR), .AWPROT(AWPROT), .AWREADY(AWREADY), .WVALID(WVALID), .WDATA(WDATA), .WSTRB(WSTRB), .WREADY(WREADY), .BREADY(BREADY), .BVALID(BVALID), .BRESP(BRESP), .ARVALID(ARVALID_GPIO_0), .ARADDR(ARADDR), .ARPROT(ARPROT), .ARREADY(ARREADY), .RREADY(RREADY), .RVALID(RVALID), .RDATA(RDATA), .RRESP(RRESP));

initial
begin
    clk = 0;
    rst = 1;
    $dumpvars(0, Bus);
    $dumpflush;
    #50;
    rst = 0;
    // Your code here 
end

endmodule

