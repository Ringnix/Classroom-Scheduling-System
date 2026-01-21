package com.zcl.controller;

import com.zcl.common.Result;
import com.zcl.entity.Course;
import com.zcl.service.CourseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/course")
public class CourseController {

    @Autowired
    private CourseService courseService;

    @GetMapping("/all")
    public Result<List<Course>> all() {
        return Result.ok(courseService.listAll());
    }

    @PostMapping("/save")
    public Result<String> save(@RequestBody Course c){
        return courseService.saveCourse(c);
    }

    @PutMapping("/update")
    public Result<String> update(@RequestBody Course c) {
        return courseService.updateCourse(c);
    }

    @DeleteMapping("/delete/{id}")
    public Result<String> delete(@PathVariable String id){
        return courseService.deleteCourse(id);
    }
}
