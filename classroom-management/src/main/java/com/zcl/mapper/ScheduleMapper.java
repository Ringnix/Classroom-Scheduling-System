package com.zcl.mapper;

import com.zcl.entity.Schedule;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ScheduleMapper {
    List<Schedule> findAll();
    Schedule findById(@Param("id") String id);
    List<Schedule> findByClassroomAndWeekday(@Param("classroomId") String classroomId,
                                             @Param("weekDay") Integer weekDay);
    List<Schedule> findByClassroomId(@Param("classroomId") String classroomId);
    List<Schedule> findByCourseId(@Param("courseId") String courseId);
    List<Schedule> findByTeacher(@Param("teacher") String teacher);
    List<Schedule> findByClassroomIdAndDate(@Param("classroomId") String classroomId, @Param("date") String date);
    List<Schedule> findCurrentSchedules(@Param("currentDate") String currentDate, @Param("currentTime") String currentTime);
    int insert(Schedule schedule);
    int update(Schedule schedule);
    int delete(@Param("id") String id);
}

