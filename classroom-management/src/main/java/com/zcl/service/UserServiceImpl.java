package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.entity.Course;
import com.zcl.entity.User;
import com.zcl.mapper.CourseMapper;
import com.zcl.mapper.ScheduleMapper;
import com.zcl.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private CourseMapper courseMapper;
    
    @Autowired
    private ScheduleMapper scheduleMapper;

    @Override
    public Result<String> createUser(User user) {
        // 检查用户名是否已存在
        if (userMapper.findByUsername(user.getUsername()) != null) {
            return Result.fail("用户名已存在");
        }
        // 生成 UUID 作为主键
        if (user.getId() == null) {
            user.setId(UUID.randomUUID().toString());
        }
        userMapper.insert(user);
        return Result.ok("用户创建成功");
    }

    @Override
    public Result<String> updateUser(User user) {
        User exist = userMapper.findById(user.getId());
        if (exist == null) return Result.fail("用户不存在");
        userMapper.update(user);
        return Result.ok("更新成功");
    }

    @Override
    public Result<String> deleteUser(String id) {
        try {
            User exist = userMapper.findById(id);
            if (exist == null) return Result.fail("用户不存在");
            
            // 检查该用户是否有相关课程
            List<Course> courses = courseMapper.findByTeacher(exist.getUsername());
            if (courses != null && !courses.isEmpty()) {
                return Result.fail("存在相关课程或预约，无法删除");
            }
            
            userMapper.delete(id);
            return Result.ok("删除成功");
        } catch (Exception e) {
            // 检查是否是外键约束错误
            if (e.getMessage() != null && (e.getMessage().contains("foreign key") || 
                    e.getMessage().contains("constraint") || 
                    e.getMessage().contains("外键"))) {
                return Result.fail("存在相关课程或预约，无法删除");
            }
            return Result.fail("删除失败: " + e.getMessage());
        }
    }

    @Override
    public List<User> listAll() {
        return userMapper.findAll();
    }

    @Override
    public User findById(String id) {
        return userMapper.findById(id);
    }
}
