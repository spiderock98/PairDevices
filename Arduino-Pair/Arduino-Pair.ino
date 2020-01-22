#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <SocketIOClient.h>
#include <ArduinoJson.h>

void blinkSmartConfig() {
    digitalWrite(16, HIGH);   // turn the LED on (HIGH is the voltage level)
    delay(50);              // wait for a second 
    digitalWrite(16, LOW);    // turn the LED off by making the voltage LOW
    delay(50);
}

void blinkClearConfig() {
  int i=0;
  while(i<=3) {
    digitalWrite(16, HIGH);   // turn the LED on (HIGH is the voltage level)
    delay(100);              // wait for a second 
    digitalWrite(16, LOW);    // turn the LED off by making the voltage LOW
    delay(100);
    i++;
  }
}

SocketIOClient client;
String jsonOut;

void setup() {
  int cnt = 0;
  pinMode(16,OUTPUT);
  pinMode(0, INPUT_PULLUP);
  
  StaticJsonDocument<200> doc;

  WiFi.mode(WIFI_STA);
  
  Serial.begin(115200);
  //WiFi.disconnect();
  
  // read pullup
  int isSmartConfig = digitalRead(0);
  if (isSmartConfig==0) {
    // bink for clear config
    blinkClearConfig();
    Serial.println("clear config");
    // reset default config
    WiFi.disconnect();

  }

  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if(cnt++ >= 15){
       WiFi.beginSmartConfig();
       while(1){
           delay(500);
           if(WiFi.smartConfigDone()){
             Serial.println("SmartConfig Success");
             blinkSmartConfig();
             break;
           }
       }
    }
  }

  Serial.println("");
  Serial.println("");
  
  WiFi.printDiag(Serial);

  doc["MAC"] = WiFi.macAddress();
  doc["IP"] = WiFi.localIP().toString();
  doc["SSID"] = WiFi.SSID();
  doc["PSK"] = WiFi.psk();

  serializeJson(doc, jsonOut);
  
  if (!client.connect("192.168.1.3", 80)) {
    Serial.println("Failed to connect to host");
    return;
  }
  
  if (client.connected()) {
    Serial.print("Succesful connected to ");
    Serial.println(WiFi.hostname());
    client.sendJSON("nodemcu", jsonOut);
    Serial.println("sent json string: " + jsonOut);
  }
}

void loop() {
}
