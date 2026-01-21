package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.dto.ScheduleDTO;
import com.zcl.entity.Course;
import com.zcl.entity.Schedule;
import com.zcl.entity.Classroom;
import com.zcl.mapper.ScheduleMapper;
import com.zcl.mapper.CourseMapper;
import com.zcl.mapper.ClassroomMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ScheduleServiceImpl implements ScheduleService {

    @Autowired
    private ScheduleMapper scheduleMapper;

    @Autowired
    private CourseMapper courseMapper;

    @Autowired
    private ClassroomMapper classroomMapper;

    @Override
    public Result<String> addSchedule(Schedule schedule) {
        // 生成UUID
        if (schedule.getId() == null) {
            schedule.setId(UUID.randomUUID().toString());
        }
        
        // 1. 检查同一教室时间冲突
        List<Schedule> classroomExists = scheduleMapper.findByClassroomAndWeekday(
                schedule.getClassroomId(), schedule.getWeekDay());

        for (Schedule ex : classroomExists) {
            if (!(schedule.getEndTime().isBefore(ex.getStartTime()) ||
                    schedule.getStartTime().isAfter(ex.getEndTime()))) {
                return Result.fail("教室时间冲突");
            }
        }

        // 2. 检查同一教师时间冲突
        Course course = courseMapper.findById(schedule.getCourseId());
        if (course == null) return Result.fail("课程不存在");

        List<Schedule> teacherExists = scheduleMapper.findByTeacher(course.getTeacher());
        for (Schedule ex : teacherExists) {
            if (!ex.getWeekDay().equals(schedule.getWeekDay())) continue;
            if (!(schedule.getEndTime().isBefore(ex.getStartTime()) ||
                    schedule.getStartTime().isAfter(ex.getEndTime()))) {
                return Result.fail("教师时间冲突");
            }
        }

        // 3. 插入排课
        scheduleMapper.insert(schedule);
        updateClassroomStatus(); // 预约后更新课室状态
        return Result.ok("排课成功");
    }

    @Override
    public Result<String> updateSchedule(Schedule schedule) {
        // 检查排课是否存在
        if (schedule.getId() == null || schedule.getId().trim().isEmpty()) {
            return Result.fail("排课ID不能为空");
        }

        Schedule existingSchedule = scheduleMapper.findById(schedule.getId());
        if (existingSchedule == null) {
            return Result.fail("排课不存在");
        }

        // 检查同一教室时间冲突（排除当前排课）
        List<Schedule> classroomExists = scheduleMapper.findByClassroomAndWeekday(
                schedule.getClassroomId(), schedule.getWeekDay());

        for (Schedule ex : classroomExists) {
            if (!ex.getId().equals(schedule.getId())) { // 排除当前更新的排课
                if (!(schedule.getEndTime().isBefore(ex.getStartTime()) ||
                        schedule.getStartTime().isAfter(ex.getEndTime()))) {
                    return Result.fail("教室时间冲突");
                }
            }
        }

        // 检查同一教师时间冲突（排除当前排课）
        Course course = courseMapper.findById(schedule.getCourseId());
        if (course == null) return Result.fail("课程不存在");

        List<Schedule> teacherExists = scheduleMapper.findByTeacher(course.getTeacher());
        for (Schedule ex : teacherExists) {
            if (!ex.getWeekDay().equals(schedule.getWeekDay()) || ex.getId().equals(schedule.getId())) continue;
            if (!(schedule.getEndTime().isBefore(ex.getStartTime()) ||
                    schedule.getStartTime().isAfter(ex.getEndTime()))) {
                return Result.fail("教师时间冲突");
            }
        }

        // 更新排课
        try {
            int rowsAffected = scheduleMapper.update(schedule);
            if (rowsAffected == 0) {
                return Result.fail("更新失败，未找到对应的排课记录");
            }
            updateClassroomStatus(); // 更新预约后更新课室状态
            return Result.ok("排课更新成功");
        } catch (Exception e) {
            return Result.fail("更新失败: " + e.getMessage());
        }
    }

    @Override
    public List<ScheduleDTO> listAll() {
        List<Schedule> schedules = scheduleMapper.findAll();
        return convertToDTO(schedules);
    }

    @Override
    public List<ScheduleDTO> listByClassroom(String classroomId) {
        List<Schedule> schedules = scheduleMapper.findByClassroomId(classroomId);
        return convertToDTO(schedules);
    }

    @Override
    public List<ScheduleDTO> listByCourse(String courseId) {
        List<Schedule> schedules = scheduleMapper.findByCourseId(courseId);
        return convertToDTO(schedules);
    }

    @Override
    public List<ScheduleDTO> listByTeacher(String teacher) {
        List<Schedule> schedules = scheduleMapper.findByTeacher(teacher);
        return convertToDTO(schedules);
    }

    @Override
    public Result<String> deleteSchedule(String id) {
        scheduleMapper.delete(id);
        updateClassroomStatus(); // 删除预约后更新课室状态
        return Result.ok("删除成功");
    }

    @Override
    public List<ScheduleDTO> listByClassroomIdAndDate(String classroomId, String date) {
        List<Schedule> schedules = scheduleMapper.findByClassroomIdAndDate(classroomId, date);
        return convertToDTO(schedules);
    }

    @Override
    public List<ScheduleDTO> listCurrentSchedules(String currentDate, String currentTime) {
        List<Schedule> schedules = scheduleMapper.findCurrentSchedules(currentDate, currentTime);
        return convertToDTO(schedules);
    }

    // -------------------- 辅助方法 --------------------
    private List<ScheduleDTO> convertToDTO(List<Schedule> schedules) {
        List<ScheduleDTO> dtos = new ArrayList<>();
        for (Schedule s : schedules) {
            Classroom classroom = classroomMapper.findById(s.getClassroomId());
            Course course = courseMapper.findById(s.getCourseId());
            if (classroom == null || course == null) continue;

            ScheduleDTO dto = new ScheduleDTO();
            dto.setId(s.getId());
            dto.setClassroomName(classroom.getRoomName());
            dto.setCourseName(course.getCourseName());
            dto.setTeacher(course.getTeacher());
            dto.setWeekDay(s.getWeekDay());
            dto.setStartTime(s.getStartTime());
            dto.setEndTime(s.getEndTime());
            dto.setDate(s.getDate()); // 添加日期字段
            dtos.add(dto);
        }
        return dtos;
    }
    
    // 添加方法来更新课室状态
    @Override
    public void updateClassroomStatus() {
        // 获取当前日期和时间
        String today = java.time.LocalDate.now().toString();
        String currentTime = java.time.LocalTime.now().toString().substring(0, 8); // 使用HH:MM:SS格式
        
        // 获取当前时间正在使用的所有课室的预约
        List<Schedule> currentSchedules = scheduleMapper.findCurrentSchedules(today, currentTime);
        
        // 创建一个包含当前被占用课室ID的集合
        Set<String> occupiedClassroomIds = new HashSet<>();
        for (Schedule schedule : currentSchedules) {
            occupiedClassroomIds.add(schedule.getClassroomId());
        }
        
        // 获取所有课室并更新状态
        List<Classroom> classrooms = classroomMapper.findAll();
        for (Classroom classroom : classrooms) {
            // 检查课室是否被占用
            boolean isUsed = occupiedClassroomIds.contains(classroom.getId());
            
            // 更新课室状态
            classroom.setStatus(isUsed ? "USED" : "FREE");
            classroomMapper.update(classroom);
        }
    }
}
