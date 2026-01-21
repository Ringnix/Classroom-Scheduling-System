package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.entity.Course;
import com.zcl.entity.Schedule;
import com.zcl.mapper.CourseMapper;
import com.zcl.mapper.ScheduleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CourseServiceImpl implements CourseService {

    @Autowired
    private CourseMapper courseMapper;
    
    @Autowired
    private ScheduleMapper scheduleMapper;

    @Override
    public Result<String> saveCourse(Course course) {
        if (course.getId() == null) {
            course.setId(UUID.randomUUID().toString());
        }
        if (courseMapper.findById(course.getId()) == null) {
            courseMapper.insert(course);
        } else {
            courseMapper.update(course);
        }
        return Result.ok("保存成功");
    }

    @Override
    public Result<String> updateCourse(Course course) {
        if (course.getId() == null || courseMapper.findById(course.getId()) == null) {
            return Result.fail("课程不存在");
        }
        courseMapper.update(course);
        return Result.ok("更新成功");
    }

    @Override
    public Result<String> deleteCourse(String id) {
        try {
            // 检查是否有相关的预约
            List<Schedule> schedules = scheduleMapper.findByCourseId(id);
            if (schedules != null && !schedules.isEmpty()) {
                return Result.fail("存在相关预约，无法删除");
            }
            
            courseMapper.delete(id);
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
    public List<Course> listAll() {
        return courseMapper.findAll();
    }

    @Override
    public Course findById(String id) {
        return courseMapper.findById(id);
    }
}
