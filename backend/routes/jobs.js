const express = require('express');
const router = express.Router();
const JobPosting = require('../models/JobPosting');
const JobSeeker = require('../models/JobSeeker');
const auth = require('../middleware/auth');

// Create a new job posting
router.post('/post', auth, async (req, res) => {
    try {
        const newJob = new JobPosting({
            ...req.body,
            employerId: req.user.id
        });
        await newJob.save();
        res.status(201).json(newJob);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all job postings
router.get('/listings', async (req, res) => {
    try {
        const jobs = await JobPosting.find({ status: 'active' });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Apply for a job
router.post('/apply/:jobId', auth, async (req, res) => {
    try {
        const job = await JobPosting.findById(req.params.jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(400).json({ message: 'Job seeker profile not found' });
        }

        // Check if already applied
        const alreadyApplied = job.applicants.some(
            applicant => applicant.jobSeeker.toString() === jobSeeker._id.toString()
        );

        if (alreadyApplied) {
            return res.status(400).json({ message: 'Already applied to this job' });
        }

        // Add applicant to job
        job.applicants.push({
            jobSeeker: jobSeeker._id,
            status: 'applied'
        });
        job.statistics.totalApplicants += 1;

        // Add job to seeker's applications
        jobSeeker.applications.push({
            jobId: job._id,
            status: 'applied'
        });

        await Promise.all([job.save(), jobSeeker.save()]);
        res.json({ message: 'Successfully applied for the job' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update application status
router.patch('/status/:jobId/:applicantId', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const job = await JobPosting.findById(req.params.jobId);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const applicant = job.applicants.find(
            app => app._id.toString() === req.params.applicantId
        );

        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        // Update statistics
        if (applicant.status !== status) {
            job.statistics[applicant.status.toLowerCase()] -= 1;
            job.statistics[status.toLowerCase()] += 1;
        }

        applicant.status = status;
        await job.save();

        // Update jobseeker's application status
        const jobSeeker = await JobSeeker.findById(applicant.jobSeeker);
        if (jobSeeker) {
            const application = jobSeeker.applications.find(
                app => app.jobId.toString() === job._id.toString()
            );
            if (application) {
                application.status = status;
                await jobSeeker.save();
            }
        }

        res.json({ message: 'Application status updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get job statistics
router.get('/statistics', auth, async (req, res) => {
    try {
        const jobs = await JobPosting.find({ employerId: req.user.id });
        const statistics = {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(job => job.status === 'active').length,
            totalApplicants: jobs.reduce((sum, job) => sum + job.statistics.totalApplicants, 0),
            byCategory: {},
            byStatus: {
                applied: 0,
                shortlisted: 0,
                declined: 0,
                invited: 0,
                interviewed: 0
            }
        };

        // Calculate statistics by category and status
        jobs.forEach(job => {
            if (!statistics.byCategory[job.category]) {
                statistics.byCategory[job.category] = 0;
            }
            statistics.byCategory[job.category]++;

            Object.keys(job.statistics).forEach(status => {
                if (status !== 'totalApplicants') {
                    statistics.byStatus[status] += job.statistics[status];
                }
            });
        });

        res.json(statistics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;