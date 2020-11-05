#include <ArduinoJson.h>
#include <SoftwareSerial.h>

SoftwareSerial mySer(2, 3); // RX TX Arduino
//SoftwareSerial mySer(15, 14); // RX TX ESP32-CAM
String strRecvFromServer = "{\"nSize\":2,\"arrDeviceId\":[\"1A\",\"2B\"]}";
StaticJsonDocument<200> docParser;
uint8_t nSize ;

void setup() {
  mySer.begin(9600);
  Serial.begin(9600);

  DeserializationError error = deserializeJson(docParser, strRecvFromServer);
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.c_str());
    return;
  }
  nSize = docParser["nSize"];
}

void loop() {
  for (int i = 0; i < nSize; i++) {
    String currentDeviceId = docParser["arrDeviceId"][i];
    String strSendJson = "{\"deviceId\":\"" + currentDeviceId  + "\",\"temp\":\"" + String(random(30)) + "\",\"humid\":\"" + String(random(100)) + "\"}";
    mySer.println(strSendJson);
    delay(2000);
  }
}
