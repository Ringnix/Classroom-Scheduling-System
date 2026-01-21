package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.entity.Classroom;
import com.zcl.entity.Schedule;
import com.zcl.mapper.ClassroomMapper;
import com.zcl.mapper.ScheduleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ClassroomServiceImpl implements ClassroomService {

    // 状态常量
    private static final String STATUS_FREE = "FREE";
    private static final String STATUS_USED = "USED";
    private static final String STATUS_AVAILABLE = "AVAILABLE";
    private static final String STATUS_UNAVAILABLE = "UNAVAILABLE";

    @Autowired
    private ClassroomMapper classroomMapper;
    
    @Autowired
    private ScheduleMapper scheduleMapper;

    @Override
    public Result<String> saveClassroom(Classroom classroom) {
        if (classroom.getId() == null) {
            classroom.setId(UUID.randomUUID().toString());
        }
        // 规范化状态值，确保它们是允许的值之一
        if(classroom.getStatus() != null) {
            String status = classroom.getStatus().toUpperCase();
            if(status.equals(STATUS_AVAILABLE)) {
                classroom.setStatus(STATUS_FREE); // 将AVAILABLE映射为FREE
            } else if(status.equals(STATUS_UNAVAILABLE)) {
                classroom.setStatus(STATUS_USED); // 将UNAVAILABLE映射为USED
            } else if(!status.equals(STATUS_FREE) && !status.equals(STATUS_USED)) {
                classroom.setStatus(STATUS_FREE);
            } else {
                classroom.setStatus(status); // 使用原值（转换为大写）
            }
        } else {
            classroom.setStatus(STATUS_FREE);
        }
        if (classroomMapper.findById(classroom.getId()) == null) {
            classroomMapper.insert(classroom);
        } else {
            classroomMapper.update(classroom);
        }
        return Result.ok("保存成功");
    }

    @Override
    public Result<String> updateClassroom(Classroom classroom) {
        if (classroom.getId() == null || classroomMapper.findById(classroom.getId()) == null) {
            return Result.fail("教室不存在");
        }
        // 规范化状态值，确保它们是允许的值之一
        if(classroom.getStatus() != null) {
            String status = classroom.getStatus().toUpperCase();
            if(status.equals(STATUS_AVAILABLE)) {
                classroom.setStatus(STATUS_FREE); // 将AVAILABLE映射为FREE
            } else if(status.equals(STATUS_UNAVAILABLE)) {
                classroom.setStatus(STATUS_USED); // 将UNAVAILABLE映射为USED
            } else if(!status.equals(STATUS_FREE) && !status.equals(STATUS_USED)) {
                classroom.setStatus(STATUS_FREE);
            } else {
                classroom.setStatus(status); // 使用原值（转换为大写）
            }
        } else {
            classroom.setStatus(STATUS_FREE);
        }
        classroomMapper.update(classroom);
        return Result.ok("更新成功");
    }

    @Override
    public Result<String> deleteClassroom(String id) {
        try {
            // 检查是否有相关的预约
            List<Schedule> schedules = scheduleMapper.findByClassroomId(id);
            if (schedules != null && !schedules.isEmpty()) {
                return Result.fail("存在相关预约，无法删除");
            }
            
            classroomMapper.delete(id);
            return Result.ok("删除成功");
        } catch (Exception e) {
            // 检查是否是外键约束错误
            if (e.getMessage() != null && (e.getMessage().contains("foreign key") || 
                    e.getMessage().contains("constraint") || 
                    e.getMessage().contains("外键"))) {
                return Result.fail("存在相关预约，无法删除");
            }
            return Result.fail("删除失败: " + e.getMessage());
        }
    }

    @Override
    public List<Classroom> listAll() {
        return classroomMapper.findAll();
    }

    @Override
    public Classroom findById(String id) {
        return classroomMapper.findById(id);
    }
}
