#define DEBUG true

#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include "DHT.h"

#define motor 7
#define misty 6       // phun sương
#define DHTPIN 2      // Đọc dữ liệu từ DHT11 ở chân 2 trên mạch Arduino
#define DHTTYPE DHT11 //Khai báo loại cảm biến, có 2 loại là DHT11 và DHT22
unsigned long nowDht;
unsigned int tThresh, hThresh;
volatile bool requestMode;
bool sta;

int h_current, dif, out;
bool flat = false;

DHT dht(DHTPIN, DHTTYPE);

void blink3times();
int avgGnd(byte n);

String deviceId = "1A";     // fixed
SoftwareSerial mySer(2, 3); // RX TX
StaticJsonDocument<200> docParser;

void setup()
{
  pinMode(LED_BUILTIN, OUTPUT);
  mySer.begin(9600);  // zigbee
  Serial.begin(9600); // debug
  while (!Serial || !mySer)
    ;
  dht.begin();

#if DEBUG
  if (EEPROM.read(0) == 0)
    Serial.println("This is BLANK NEW device");
  else if (EEPROM.read(0) == 1)
    Serial.println("This device has been registered");
#endif

  while (!EEPROM.read(0))
  {
    // this is new device >> waiting for pairing via zigbee
    if (mySer.available())
    {
      blink3times();

      String strRecv = mySer.readStringUntil('\n');
#if DEBUG
      Serial.println(strRecv);
#endif
      DeserializationError error = deserializeJson(docParser, strRecv);
      if (error)
      {
#if DEBUG
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.c_str());
#endif

        blink3times();
        // request master to resend error
        mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"initErr\"}");
      }
      else if (docParser["id"] == deviceId)
      {
#if DEBUG
        Serial.print("[Success] complete pairing new device");
#endif
        mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"initOK\"}");
        EEPROM.write(0, 1);
        blink3times();
      }
    }
  }

  nowDht = millis();
  out = 255;
}

void loop()
{
  humidground();
  if (mySer.available())
  {
    digitalWrite(LED_BUILTIN, 1);
    delay(20);
    digitalWrite(LED_BUILTIN, 0);
    String strRecv = mySer.readStringUntil('\n');
#if DEBUG
    Serial.println(strRecv);
#endif
    DeserializationError error = deserializeJson(docParser, strRecv);
    if (error)
    {
#if DEBUG
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
#endif
      return;
    }

    /////// compare id ////////
    if (docParser["deviceId"] == deviceId)
    {
      if (docParser["ev"] == "thresh")
      {
        String tempThresh = docParser["tVal"];
        String humidThresh = docParser["hVal"];
        String checkSum = docParser["cSum"];

        if (checkSum == (tempThresh + humidThresh))
        {
          tThresh = tempThresh.toInt();
          hThresh = humidThresh.toInt();

#if DEBUG
          Serial.print("Temp threshold updated: ");
          Serial.println(tThresh);
          Serial.print("Humid threshold updated: ");
          Serial.println(hThresh);
#endif
        }
      }

      else if (docParser["ev"] == "manual")
      {
        requestMode = docParser["mode"];
#if DEBUG
        Serial.println("[INFO] requestMode: " + (requestMode ? "True" : "False"));
#endif
      }
    }
  }

  //////// send dht value every 2 second
  if (millis() - nowDht > 2000)
  {
    String hum = String(dht.readHumidity());
    String tem = String(dht.readTemperature());
    String gnd = String(avgGnd(10));
    String tus = String(sta); // motor status

    mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"temp\",\"value\":\"" + tem + "\"}");
    delay(50);
    mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"humid\",\"value\":\"" + hum + "\"}");
    delay(50);
    mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"ground\",\"value\":\"" + gnd + "\"}");
    delay(50);
    mySer.println("{\"id\":\"" + deviceId + "\",\"ev\":\"status\",\"value\":\"" + tus + "\"}");
    nowDht = millis();
  }
  PID();
}

void blink3times()
{
  digitalWrite(LED_BUILTIN, 1);
  delay(20);
  digitalWrite(LED_BUILTIN, 0);
  delay(20);
  digitalWrite(LED_BUILTIN, 1);
  delay(20);
  digitalWrite(LED_BUILTIN, 0);
}

int avgGnd(byte n)
{
  unsigned int sum;
  for (byte i = n; i--;)
  {
    sum += analogRead(A0);
  }
  return (sum / n);
}

void PID()
{
  h_current = dht.readHumidity();
  if (flat == false)
  {
    analogWrite(misty, 255);
    if (h_current == hThresh)
    {
      dif = hThresh - h_current;
      out = out + dif;
      delay(10);
      analogWrite(misty, out);
      flat = true;
    }
  }
  else if (flat == true)
  {
    dif = hThresh - h_current;
    out = out + dif;
    delay(10);
    analogWrite(misty, out);
  }
}

void humidground()
{
  if (avgGnd(10) > 850 && requestMode == false)
  {
    digitalWrite(motor, 1);
  }
  else if (avgGnd(10) < 300 && requestMode == false)
  {
    digitalWrite(motor, 0);
  }
  if (requestMode == true)
  {
    digitalWrite(motor, 1);
  }
  else
  {
    digitalWrite(motor, 0);
  }
}
