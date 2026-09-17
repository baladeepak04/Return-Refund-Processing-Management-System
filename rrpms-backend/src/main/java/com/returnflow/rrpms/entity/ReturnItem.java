package com.returnflow.rrpms.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "return_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReturnItem {
    @Id
    @GeneratedValue
    private UUID id;

    // @JsonBackReference breaks the serialization cycle with
    // ReturnRequest.items (@JsonManagedReference below) — without this,
    // any endpoint returning a ReturnRequest with actual items
    // (items -> returnRequest -> items -> ...) recurses infinitely and
    // crashes with a 500. Previously untriggered only because every return
    // serialized so far in testing happened to have an empty items list.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "return_id", nullable = false)
    @JsonBackReference
    private ReturnRequest returnRequest;

    private UUID orderLineId;

    @Column(nullable = false)
    private UUID skuId;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 100)
    private String returnReason;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "return_item_evidence_urls", joinColumns = @JoinColumn(name = "return_item_id"))
    @Column(name = "evidence_urls", columnDefinition = "TEXT")
    private List<String> evidenceUrls;

    private UUID exchangeSkuId;

    @Column(name = "product_name", length = 255)
    private String productName;
}
