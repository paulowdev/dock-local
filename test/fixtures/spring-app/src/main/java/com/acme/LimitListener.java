package com.example;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class LimitListener {
  private final RestTemplate restTemplate = new RestTemplate();

  @KafkaListener(topics = "cards.limit.audit", groupId = "cards-limits")
  public void onAudit(String payload) {
    restTemplate.postForObject("https://api.example.com/v1/notify", payload, Void.class);
  }
}
