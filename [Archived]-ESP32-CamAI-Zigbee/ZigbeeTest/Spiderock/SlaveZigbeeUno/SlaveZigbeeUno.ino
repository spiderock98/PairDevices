#include <SoftwareSerial.h>
#include <ArduinoJson.h>

String deviceId = "1A";
SoftwareSerial mySer(2, 3); // RX TX
StaticJsonDocument<200> docParser;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  mySer.begin(9600);
  Serial.begin(9600);
}

void loop() {
  if (mySer.available()) {
    digitalWrite(LED_BUILTIN, 1);
    delay(50);
    digitalWrite(LED_BUILTIN, 0);
    String strRecv = mySer.readStringUntil('\n');
    Serial.println(strRecv);
    DeserializationError error = deserializeJson(docParser, strRecv);
    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
      return;
    }

    if (docParser["deviceId"] == deviceId) {
      const char* temp = docParser["temp"];
      const char* humid = docParser["humid"];

      Serial.print("Temp: ");
      Serial.println(temp);
      Serial.print("Humid: ");
      Serial.println(humid);
    }
  }
}
