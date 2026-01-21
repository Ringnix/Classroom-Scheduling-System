package com.zcl.service;

import com.zcl.common.Result;
import com.zcl.entity.Course;

import java.util.List;

public interface CourseService {
    Result<String> saveCourse(Course course);
    Result<String> deleteCourse(String id);
    List<Course> listAll();
    Course findById(String id);

    Result<String> updateCourse(Course course);
}
