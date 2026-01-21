package com.zcl.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScheduleDTO {
    private String id;
    private String classroomName;
    private String courseName;
    private String teacher;
    private Integer weekDay;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate date;    // 添加日期字段
}
