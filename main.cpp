#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h> 
#include <sys/socket.h>
#include <iostream>
#include <netinet/in.h>
#include "Beekeeper/Native/IO.h"
#include "json.hpp"

using namespace std;
using namespace IO;
using json = nlohmann::json;

static const int BUFFER_SIZE = 1024;
static const int PORT_NUMBER = 9000;

void error(const char *msg)
{
    perror(msg);
    exit(1);
}

int main(int argc, char *argv[])
{
     int sockfd, newsockfd;
     socklen_t clilen;
     char buffer[BUFFER_SIZE];
     struct sockaddr_in serv_addr, cli_addr;
     int n;
     
     sockfd = socket(AF_INET, SOCK_STREAM, 0);
     
     if (sockfd < 0) 
        error("ERROR opening socket");
     
     bzero((char *) &serv_addr, sizeof(serv_addr));
     
     serv_addr.sin_family = AF_INET;
     serv_addr.sin_addr.s_addr = INADDR_ANY;
     serv_addr.sin_port = htons(PORT_NUMBER);
     
     if (bind(sockfd, (struct sockaddr *) &serv_addr,
              sizeof(serv_addr)) < 0) 
              error("ERROR on binding");
     
     listen(sockfd,5);
     clilen = sizeof(cli_addr);
     
     newsockfd = accept(sockfd, 
                 (struct sockaddr *) &cli_addr, 
                 &clilen);
     
     if (newsockfd < 0) 
          error("ERROR on accept");
     
     bzero(buffer,BUFFER_SIZE);
     
     n = read(newsockfd,buffer,BUFFER_SIZE-1);
     if (n < 0) error("ERROR reading from socket");
     cout << buffer << endl;
     
     n = write(newsockfd,"acknowledge",18);
     if (n < 0) error("ERROR writing to socket");
     
     auto sentData = json::parse(buffer);
     
     string programPath = sentData.find("path");
     string runMode = sentData.find("mode");
     string stopPoints = sentData.find("stops");
     
     debugConfiguration(std::string& programPath, int& runMode, StopPoint::Container& stopPoints)
     
     close(newsockfd);
     close(sockfd);
     return 0; 
}
