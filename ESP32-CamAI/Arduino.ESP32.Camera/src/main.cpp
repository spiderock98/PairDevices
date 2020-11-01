#define DEBUG true
#define TEST true

#include <Arduino.h>
#include <EEPROM.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#define CAMERA_MODEL_AI_THINKER
#if TEST
#include "camera_pins.h"
#else
#include "include/camera_pins.h"
#endif

WebSocketsClient webSocket;

// define the number of bytes you want to access
#define EEPROM_SIZE 1
bool flagEnCam = false;

#if TEST
#define STASSID "VIETTEL"
#define STAPSK "Sherlock21vtag"
// bApb0Ypwg5YszGanWOBKre39zlg1
#define UID "bApb0Ypwg5YszGanWOBKre39zlg1"
#define NODENAME "vuon xoai"
#define HOST "192.168.1.99" //HOME local ip
#define PORT 81
#define LED_BUILTIN 33
#define FLASH_BUILTIN 4
#else
#define STASSID "taikhoan"
#define STAPSK "matkhau"
// bApb0Ypwg5YszGanWOBKre39zlg1
#define UID "dinhdanh"
#define NODENAME "physicalId"
#define HOST "192.168.1.99" //HOME local ip
#define PORT 81
#define LED_BUILTIN 33
#define FLASH_BUILTIN 4
#endif

const char *ssid = STASSID;
const char *password = STAPSK;
const char *uid = UID;
const char *nodename = NODENAME;

String jsonOut;
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length);

StaticJsonDocument<200> docParser;

void setup()
{
  Serial1.begin(9600, SERIAL_8N1, 13, 12); // zigbee RX TX
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  EEPROM.begin(EEPROM_SIZE);

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(FLASH_BUILTIN, OUTPUT);
  pinMode(0, INPUT_PULLUP);

  //!================/ Internet Config /================!//
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    digitalWrite(LED_BUILTIN, 1);
    delay(100);
    digitalWrite(LED_BUILTIN, 0);
    delay(100);
  }
#if DEBUG
  Serial.println("\nWiFi connected");
  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
#endif
  //!================/ Init JSON Garden Infomation /================!//
  DynamicJsonDocument doc(1024);
  JsonArray array = doc.to<JsonArray>();
  // array.add("regEsp");
  JsonObject param1 = array.createNestedObject(); // add payload (parameters) for the event

#if DEBUG
  Serial.print("Current EEPROM[0]: ");
  Serial.println(EEPROM.read(0));
#endif

  //!====/ Pairing Mode /====!//
  // EEPROM addr no.0 is 1 when devices is DONE-PAIRING
  if (EEPROM.read(0) == 1)
  {
#if DEBUG
    Serial.print("if you want to re-pair, please HOLD button in ... 3");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(1000);
#if DEBUG
    Serial.print(" ... 2");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(1000);
#if DEBUG
    Serial.print(" ... 1");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(1000);
#if DEBUG
    Serial.println(" ... 0");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(1000);

    //  if agree then enter Pairing Mode
    if (!digitalRead(0))
    {
      delay(20);
      if (!digitalRead(0))
      {
        EEPROM.write(0, 0);
        EEPROM.commit();

        digitalWrite(FLASH_BUILTIN, 1);
        delay(20);
        digitalWrite(FLASH_BUILTIN, 0);
        delay(20);
        digitalWrite(FLASH_BUILTIN, 1);
        delay(20);
        digitalWrite(FLASH_BUILTIN, 0);

#if DEBUG
        Serial.println("[ESP] BUTTON PRESSED >> EEPROM value at addr 0 is cleared");
        Serial.println("[ESP] Resetting ESP ... !!!");
#endif
        ESP.restart(); // return
      }
    }

    // if EEP value at addr 0 is 1 && not hold button >> send camera is ready
    param1["EVENT"] = "espEnCamera";
#if DEBUG
    Serial.println("Sending <espEnCamera> EVENT");
#endif
  }

  // if EEPROM value at addr no.0 is 0 then enter pairing mode WITHOUT asking
  else
  {
    //TODO: send this UI to browser
    // Serial.println("**********************************");
    // delay(500);
    // Serial.println("********\\ New Device /***********");
    // delay(500);
    // Serial.println("*                                *");
    // delay(500);
    // Serial.println("*          @Spiderock            *");
    // delay(500);
    // Serial.println("*           @SuongLe             *");
    // delay(500);
    // Serial.println("*         @TamZThePoet           *");
    // delay(500);
    // Serial.println("*           @CuongNgo            *");
    // delay(500);
    param1["EVENT"] = "regESP";
    // Serial.println("**********************************");
  }

  param1["MAC"] = WiFi.macAddress();
  param1["IP"] = WiFi.localIP().toString();
  param1["SSID"] = WiFi.SSID();
  param1["PSK"] = WiFi.psk();
  param1["UID"] = uid;
  serializeJson(doc, jsonOut);

  webSocket.begin(HOST, PORT, "/"); // server address, port and URL

  //!================/ AI-Thinker Camera Config /================!//
  if (EEPROM.read(0) == 1)
  {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    //? init with high specs to pre-allocate larger buffers
    if (psramFound())
    {
      // change format and quality here
      config.frame_size = FRAMESIZE_VGA;
      config.jpeg_quality = 40;
      config.fb_count = 2;
    }
    else
    {
      config.frame_size = FRAMESIZE_SVGA;
      config.jpeg_quality = 12;
      config.fb_count = 1;
    }
    //? camera init
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
      webSocket.sendTXT("[{\"EVENT\":\"std\",\"detail\":\"[Error] Init Camera\"}]");
#if DEBUG
      Serial.printf("Camera init failed with error 0x%x", err);
#endif
      return;
    }
    else
      webSocket.sendTXT("[{\"EVENT\":\"std\",\"detail\":\"[Success] Init Camera\"}]");
  }

  //!================/ WebSocket Config /================!//
  // webSocket.begin(HOST, PORT, "/"); // server address, port and URL
  webSocket.onEvent(webSocketEventHandle);
}

void loop()
{
  if (flagEnCam)
  {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
#if DEBUG
      Serial.println("[INFO] Capture failed");
#endif
      esp_camera_fb_return(fb);
      return;
    }
    if (fb->format != PIXFORMAT_JPEG)
    {
#if DEBUG
      Serial.println("[INFO] None-JPEG data");
#endif
      return;
    }
    webSocket.sendBIN(fb->buf, fb->len); // send message to server when Connected

    esp_camera_fb_return(fb);
  }

  if (Serial1.available())
  {
    String recvZigbee = Serial1.readStringUntil('\n');

    StaticJsonDocument<200> docParser;
    deserializeJson(docParser, recvZigbee);
#if DEBUG
    Serial.print(recvZigbee);
#endif

    String clientId = docParser["id"];
    String recvEvent = docParser["ev"];

    if (recvEvent == "initErr")
    {
      // resend init json string
      Serial1.println("{\"id\":\"" + clientId + "\",\"ev\":\"init\"}");
    }
    else if (recvEvent == "initOK")
    {
#if DEBUG
      Serial.println("[INFO] " + clientId + " complete pairing new device");
#endif
      webSocket.sendTXT("[{\"EVENT\":\"initDvOK\",\"detail\":\"pairing complete\"}]");
    }
  }
  webSocket.loop();
}

//!================/ Func Define /================!//
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
#if DEBUG
    Serial.printf("[WSc] Disconnected!\n");
#endif
    break;

  case WStype_CONNECTED:
    digitalWrite(FLASH_BUILTIN, 1);
#if DEBUG
    Serial.printf("[WSc] Connected to url: %s\n", payload);
#endif
    //? ====/ send message to server when Connected /==== ?//
    // [{"EVENT":"espEnCamera","MAC":"24:6F:28:B0:B5:10","IP":"192.168.1.3","SSID":"VIETTEL","PSK":"Sherlock21vtag","UID":"bApb0Ypwg5YszGanWOBKre39zlg1"}]
    webSocket.sendTXT(jsonOut);
    digitalWrite(FLASH_BUILTIN, 0);

    break;

    //!===============/ ON recieve data /================!//
  case WStype_TEXT:
#if DEBUG == true
    Serial.printf("[WSc] get text: %s\n", payload);
#endif
    StaticJsonDocument<1024> recvDoc;
    DeserializationError error = deserializeJson(recvDoc, payload, length);
    // Test if parsing success
    if (error)
    {
#if DEBUG
      Serial.print(F("[ERROR] deserializeJson() failed"));
#endif
      return;
    }
    else
    {
      String eventName = recvDoc["EVENT"];

      if (eventName == "browserEnCam")
      {
        flagEnCam = true;
#if DEBUG
        Serial.println("[INFO] START Streaming ...");
#endif
      }

      else if (eventName == "browserDisCam")
      {
        flagEnCam = false;
#if DEBUG
        Serial.println("[INFO] STOP Streaming ...");
#endif
      }

      else if (eventName == "regESP_OK")
      {
#if DEBUG
        Serial.println("[INFO] ESP Registration Successfully ...");
#endif
        //TODO: save some thing to EEPROM
        EEPROM.write(0, 1);
        EEPROM.commit();
#if DEBUG
        Serial.println("ESP Restarting ...");
#endif
        // RESET for the next setup()
        ESP.restart();
      }

      else if (eventName == "RESTART_ESP")
      {
#if DEBUG
        Serial.println("[INFO] Server request ESP to restart");
#endif
        ESP.restart();
      }

      else if (eventName == "regDV")
      {
#if DEBUG
        Serial.println("[INFO] New QR Device Detected");
        Serial.println("[INFO] Ready to send ack confirm via UART1 Zigbee");
#endif
        String strInitDeviceAddr = recvDoc["strInitDeviceAddr"];
        // sending init json string
        Serial1.println("{\"id\":\"" + strInitDeviceAddr + "\",\"ev\":\"init\"}");
      }
    }

    //? Fetch values.
    // char json[] = "{\"sensor\":\"gps\",\"time\":1351824120,\"data\":[48.756080,2.302038]}";
    // Most of the time, you can rely on the implicit casts.
    // In other case, you can do doc["time"].as<long>();
    // const char *sensor = recvDoc["sensor"];
    // long time = recvDoc["time"];
    // double latitude = recvDoc["data"][0];
    // double longitude = recvDoc["data"][1];

    break;
  }
}