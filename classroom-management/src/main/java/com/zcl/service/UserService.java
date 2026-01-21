package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.entity.User;

import java.util.List;

public interface UserService {
    Result<String> createUser(User user);
    Result<String> updateUser(User user);
    Result<String> deleteUser(String id);
    List<User> listAll();
    User findById(String id);
}
