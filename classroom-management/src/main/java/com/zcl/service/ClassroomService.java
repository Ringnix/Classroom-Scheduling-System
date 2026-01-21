package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.entity.Classroom;

import java.util.List;

public interface ClassroomService {
    Result<String> saveClassroom(Classroom classroom);
    Result<String> deleteClassroom(String id);
    List<Classroom> listAll();
    Classroom findById(String id);

    Result<String> updateClassroom(Classroom classroom);
}
