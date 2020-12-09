#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

void blink3times();

String deviceId = "2B";
SoftwareSerial mySer(2, 3); // RX TX
StaticJsonDocument<200> docParser;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  mySer.begin(9600); // zigbee
  Serial.begin(9600); // debug

  while (!Serial || !mySer);

  if (EEPROM.read(0)== 1)
    Serial.println("This device is ALREADY registered");
  else if (EEPROM.read(0) == 0)
    Serial.println("This is BLANK NEW device");

  while (!EEPROM.read(0)) {
    // this is new device >> waiting for pairing via zigbee
    if (mySer.available()) {
      blink3times();

      String strRecv = mySer.readStringUntil('\n');
      Serial.println(strRecv);
      DeserializationError error = deserializeJson(docParser, strRecv);
      if (error) {
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.c_str());

        blink3times();
        // request master to resend error
        mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"initErr\"}");
      }
      else if (docParser["id"] == deviceId) {
        const char* temp = docParser["temp"];
        const char* humid = docParser["humid"];

        Serial.print("[Success] complete pairing new device");
        mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"initOK\"}");
        EEPROM.write(0, 1);
        blink3times();
      }
    }
  }
}

void loop() {
  if (mySer.available()) {
    digitalWrite(LED_BUILTIN, 1);
    delay(20);
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

void blink3times() {
  digitalWrite(LED_BUILTIN, 1);
  delay(20);
  digitalWrite(LED_BUILTIN, 0);
  delay(20);
  digitalWrite(LED_BUILTIN, 1);
  delay(20);
  digitalWrite(LED_BUILTIN, 0);
}
