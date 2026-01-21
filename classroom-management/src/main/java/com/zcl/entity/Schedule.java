package com.zcl.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Schedule {
    private String id;         // UUID
    private String classroomId;
    private String courseId;
    private Integer weekDay;   // 1-7
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate date;    // 添加日期字段
}
