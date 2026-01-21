package com.zcl.controller;

import com.zcl.common.Result;
import com.zcl.entity.User;
import com.zcl.mapper.UserMapper;
import com.zcl.service.UserService;
import com.zcl.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserMapper userMapper;


    @PostMapping("/login")
    public Result<?> login(@RequestBody User u){
        User user = userMapper.findByUsername(u.getUsername());
        if(user==null) return Result.fail("用户不存在");
        if(!user.getPassword().equals(u.getPassword())) return Result.fail("密码错误");
        String token = JwtUtil.createToken(user.getUsername(), user.getRole());
        
        // 创建返回对象，包含token和用户信息
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("role", user.getRole());
        
        return Result.ok(result);
    }


    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public Result<?> register(@RequestBody User u){
        // 默认注册角色为 TEACHER（或前端传 role，视需求）
        if (u.getRole() == null) u.setRole("TEACHER");
        Result<String> res = userService.createUser(u);
        return res;
    }

}
