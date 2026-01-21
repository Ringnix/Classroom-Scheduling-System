package com.zcl.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Classroom {
    private String id;       // UUID
    private String roomName;
    private Integer capacity;
    private String equipment;
    private String status;   // FREE/USED
}
