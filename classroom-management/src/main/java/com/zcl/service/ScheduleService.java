package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.dto.ScheduleDTO;
import com.zcl.entity.Schedule;

import java.util.List;

public interface ScheduleService {

    Result<String> addSchedule(Schedule schedule);

    Result<String> updateSchedule(Schedule schedule);

    List<ScheduleDTO> listAll();

    List<ScheduleDTO> listByClassroom(String classroomId);

    List<ScheduleDTO> listByCourse(String courseId);

    List<ScheduleDTO> listByTeacher(String teacher);

    Result<String> deleteSchedule(String id);

    List<ScheduleDTO> listByClassroomIdAndDate(String classroomId, String date);
    
    List<ScheduleDTO> listCurrentSchedules(String currentDate, String currentTime);
    
    void updateClassroomStatus();
}
