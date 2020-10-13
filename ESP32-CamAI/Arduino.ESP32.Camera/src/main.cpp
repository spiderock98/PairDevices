#define DEBUG true
#define TEST true

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#define CAMERA_MODEL_AI_THINKER
#if TEST == true
#include "camera_pins.h"
#else
#include "include/camera_pins.h"
#endif

WebSocketsClient webSocket;

bool flagEnCam = false;

#if TEST == true
#define STASSID "VIETTEL"
#define STAPSK "Sherlock21vtag"
// bApb0Ypwg5YszGanWOBKre39zlg1
#define UID "bApb0Ypwg5YszGanWOBKre39zlg1"
#define NODENAME "vuon xoai"
#define HOST "192.168.1.5" //HOME local ip
#define PORT 81
#define LED_BUILTIN 33
#define FLASH_BUILTIN 4
#else
#define STASSID "taikhoan"
#define STAPSK "matkhau"
// bApb0Ypwg5YszGanWOBKre39zlg1
#define UID "dinhdanh"
#define NODENAME "physicalId"
#define HOST "192.168.1.4" //HOME local ip
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

void setup()
{
#if DEBUG == true
  Serial.begin(115200);
  Serial.setDebugOutput(true);
#endif
  pinMode(LED_BUILTIN, OUTPUT);

  //!================/ AI-Thinker Camera Config /================!//
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
#if DEBUG == true
    Serial.printf("Camera init failed with error 0x%x", err);
#endif
    return;
  }

  //!================/ Internet Config /================!//
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    digitalWrite(LED_BUILTIN, 1);
    delay(100);
    digitalWrite(LED_BUILTIN, 0);
    delay(100);
  }
#if DEBUG == true
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
  //TODO: nếu nhấn btn thì pair | re-pair không thì ko regEsp
  // param1["EVENT"] = "regESP";
  param1["EVENT"] = "espEnCamera";
  param1["MAC"] = WiFi.macAddress();
  param1["IP"] = WiFi.localIP().toString();
  param1["SSID"] = WiFi.SSID();
  param1["PSK"] = WiFi.psk();
  param1["UID"] = uid;
  serializeJson(doc, jsonOut);
  //!================/ WebSocket Config /================!//
  webSocket.begin(HOST, PORT, "/"); // server address, port and URL
  webSocket.onEvent(webSocketEventHandle);
}

void loop()
{
  //     if (flagEnCam)
  //     {
  //         camera_fb_t *fb = esp_camera_fb_get();
  //         if (!fb)
  //         {
  // #if DEBUG == true
  //             Serial.println("[INFO] Capture failed");
  // #endif
  //             esp_camera_fb_return(fb);
  //             return;
  //         }
  //         if (fb->format != PIXFORMAT_JPEG)
  //         {
  // #if DEBUG == true
  //             Serial.println("[INFO] None-JPEG data");
  // #endif
  //             return;
  //         }
  //         webSocket.sendBIN(fb->buf, fb->len); // send message to server when Connected

  //         esp_camera_fb_return(fb);
  //     }

  webSocket.loop();
}

//!================/ Func Define /================!//
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
#if DEBUG == true
    Serial.printf("[WSc] Disconnected!\n");
#endif
    break;

  case WStype_CONNECTED:
#if DEBUG == true
    Serial.printf("[WSc] Connected to url: %s\n", payload);
#endif
    //? ====/ send message to server when Connected /==== ?//
    webSocket.sendTXT(jsonOut);
    break;

    //!=====/ on recieve data /=====!//
  case WStype_TEXT:
#if DEBUG == true
    Serial.printf("[WSc] get text: %s\n", payload);
#endif
    StaticJsonDocument<1024> recvDoc;
    DeserializationError error = deserializeJson(recvDoc, payload, length);
    //? Test if parsing succeeds.
    if (error)
    {
#if DEBUG == true
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
#if DEBUG == true
        Serial.println("[INFO] START Streaming ...");
#endif
      }
      else if (eventName == "browserDisCam")
      {
        flagEnCam = false;
#if DEBUG == true
        Serial.println("[INFO] STOP Streaming ...");
#endif
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