package com.zcl.controller;

import com.zcl.common.Result;
import com.zcl.entity.User;
import com.zcl.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    // 查询所有用户（仅 ADMIN 可调用）
    @GetMapping("/all")
    public Result<List<User>> listAll() {
        return Result.ok(userService.listAll());
    }

    // 根据 ID 查询用户
    @GetMapping("/{id}")
    public Result<User> getById(@PathVariable String id) {
        User u = userService.findById(id);
        if (u == null) return Result.fail("用户不存在");
        return Result.ok(u);
    }

    // 创建用户
    @PostMapping("/create")
    public Result<String> create(@RequestBody User user) {
        return userService.createUser(user);
    }

    // 更新用户
    @PutMapping("/update")
    public Result<String> update(@RequestBody User user) {
        return userService.updateUser(user);
    }

    // 删除用户
    @DeleteMapping("/delete/{id}")
    public Result<String> delete(@PathVariable String id) {
        return userService.deleteUser(id);
    }

    // 获取当前登录用户信息
    @GetMapping("/info")
    public Result<User> getInfo() {
        // 这里应该从JWT token中获取用户信息
        // 暂时返回一个示例用户
        User user = new User();
        user.setUsername("admin");
        user.setRole("ADMIN");
        return Result.ok(user);
    }
}
