-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 05, 2024 at 04:24 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `doj`
--

-- --------------------------------------------------------

--
-- Table structure for table `applicationstatus`
--

CREATE TABLE `applicationstatus` (
  `status_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `review_status` enum('Pending','In Progress','Completed') DEFAULT 'Pending',
  `outcome` enum('Accepted','Rejected') DEFAULT NULL,
  `reviewer_notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reviewer_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointmentemploymenthistory`
--

CREATE TABLE `appointmentemploymenthistory` (
  `application_id` int(11) NOT NULL,
  `appointment_locations` varchar(255) DEFAULT NULL,
  `employment_history` text DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `businessinfrastructuredetails`
--

CREATE TABLE `businessinfrastructuredetails` (
  `infrastructure_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `proof_of_rental` text DEFAULT NULL,
  `staff_details` text DEFAULT NULL,
  `num_computers` int(11) DEFAULT NULL,
  `num_printers` int(11) DEFAULT NULL,
  `additional_info` text DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `businessinfrastructuredetails`
--

INSERT INTO `businessinfrastructuredetails` (`infrastructure_id`, `application_id`, `proof_of_rental`, `staff_details`, `num_computers`, `num_printers`, `additional_info`, `is_completed`) VALUES
(2, 49, 'dsdsdsffds', 'dsfdsfdsf', 55, 55, 'dsdfsfd', 1);

-- --------------------------------------------------------

--
-- Table structure for table `disqualificationrelationship`
--

CREATE TABLE `disqualificationrelationship` (
  `application_id` int(11) NOT NULL,
  `disqualification_details` text DEFAULT NULL,
  `relationship_disclosure` enum('not_related','related') DEFAULT NULL,
  `relationship_details` text DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employmentbusinesstrading`
--

CREATE TABLE `employmentbusinesstrading` (
  `application_id` int(11) NOT NULL,
  `employer_name` varchar(255) DEFAULT NULL,
  `business_telephone` varchar(20) DEFAULT NULL,
  `business_address` text DEFAULT NULL,
  `firm_name` varchar(255) DEFAULT NULL,
  `partners_or_directors` text DEFAULT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `business_details` text DEFAULT NULL,
  `trading_partners` text DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employmentbusinesstrading`
--

INSERT INTO `employmentbusinesstrading` (`application_id`, `employer_name`, `business_telephone`, `business_address`, `firm_name`, `partners_or_directors`, `business_name`, `business_details`, `trading_partners`, `is_completed`) VALUES
(49, 'Size 11', 'sasadds', 'sasda', 'sadsda', 'sadsda', 'sasad', 'ssda', 'sadsadsad', 1);

-- --------------------------------------------------------

--
-- Table structure for table `liquidatorapplication`
--

CREATE TABLE `liquidatorapplication` (
  `application_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('Draft','Submitted','Reviewed','Approved','Rejected') DEFAULT 'Draft',
  `current_step` int(11) DEFAULT 1,
  `last_saved_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `opening_date` date DEFAULT NULL,
  `closing_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `liquidatorapplication`
--

INSERT INTO `liquidatorapplication` (`application_id`, `user_id`, `status`, `current_step`, `last_saved_at`, `opening_date`, `closing_date`) VALUES
(49, 67, 'Draft', 5, '2024-11-05 14:58:06', '2024-10-23', '2024-11-30');

-- --------------------------------------------------------

--
-- Table structure for table `liquidatorapplicationsettings`
--

CREATE TABLE `liquidatorapplicationsettings` (
  `id` int(11) NOT NULL,
  `opening_date` date NOT NULL,
  `closing_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `liquidatorapplicationsettings`
--

INSERT INTO `liquidatorapplicationsettings` (`id`, `opening_date`, `closing_date`) VALUES
(1, '2024-10-23', '2024-11-30');

-- --------------------------------------------------------

--
-- Table structure for table `officeaddresses`
--

CREATE TABLE `officeaddresses` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `province1` varchar(100) DEFAULT NULL,
  `address1` text DEFAULT NULL,
  `province2` varchar(100) DEFAULT NULL,
  `address2` text DEFAULT NULL,
  `province3` varchar(100) DEFAULT NULL,
  `address3` text DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `officeaddresses`
--

INSERT INTO `officeaddresses` (`id`, `application_id`, `province1`, `address1`, `province2`, `address2`, `province3`, `address3`, `is_completed`) VALUES
(1, 49, 'dsfsfd', 'sdfsfddsf', 'sfdfds', 'fdsdfs', 'dsfdsf', 'sfdfds', 1);

-- --------------------------------------------------------

--
-- Table structure for table `otps`
--

CREATE TABLE `otps` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `otpPurpose` enum('email_verification','password_reset') NOT NULL,
  `otpExpiresAt` datetime NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `isUsed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otps`
--

INSERT INTO `otps` (`id`, `userId`, `otp`, `otpPurpose`, `otpExpiresAt`, `createdAt`, `isUsed`) VALUES
(66, 67, '391165', 'email_verification', '2024-10-28 21:29:42', '2024-10-28 19:19:42', 1),
(67, 68, '817651', 'email_verification', '2024-10-28 21:41:22', '2024-10-28 19:31:22', 1),
(68, 69, '353027', 'email_verification', '2024-11-04 22:36:40', '2024-11-04 20:26:40', 0);

-- --------------------------------------------------------

--
-- Table structure for table `personalinfo`
--

CREATE TABLE `personalinfo` (
  `personal_info_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `identity_number` varchar(20) DEFAULT NULL,
  `race` varchar(50) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `personalinfo`
--

INSERT INTO `personalinfo` (`personal_info_id`, `application_id`, `full_name`, `identity_number`, `race`, `gender`, `is_completed`) VALUES
(19, 49, 'Sizwe ddfd', '434354354', 'African', 'Male', 1);

-- --------------------------------------------------------

--
-- Table structure for table `qualificationsprofessionalmemberships`
--

CREATE TABLE `qualificationsprofessionalmemberships` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `qualifications` text NOT NULL,
  `professional_memberships` text DEFAULT NULL,
  `membership_confirmation_file` varchar(255) DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `taxbondbankdocumentation`
--

CREATE TABLE `taxbondbankdocumentation` (
  `application_id` int(11) NOT NULL,
  `tax_clearance_certificate` text DEFAULT NULL,
  `bond_facility_confirmation` text DEFAULT NULL,
  `bank_account_proof` text DEFAULT NULL,
  `declaration_agreement` tinyint(1) DEFAULT 0,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `firstName` varchar(100) NOT NULL,
  `lastName` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('official','liquidator','chief master') DEFAULT 'official',
  `isVerified` tinyint(1) DEFAULT 0,
  `verifiedAt` datetime DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `firstName`, `lastName`, `email`, `password`, `role`, `isVerified`, `verifiedAt`, `createdAt`, `updatedAt`) VALUES
(67, 'Sizwe', 'Lutshete', 'sizwelutshete@gmail.com', '$2a$10$TYXjLcIh1j1pGUL8Ddoc..H3wUnZ.f4i4Fnc3clcMFoRZ/jnr30iu', 'liquidator', 1, '2024-10-28 21:20:28', '2024-10-28 19:19:42', '2024-10-28 19:20:28'),
(68, 'xolisa', 'sqwepu', 'xsqwepu@gmail.com', '$2a$10$HOhfSZoJQjjjKEbSzAMOoe4a1k1bXw34IZx.sFNZbS2eisf2c5HQW', 'liquidator', 1, '2024-10-28 21:32:21', '2024-10-28 19:31:22', '2024-10-28 19:32:21'),
(69, 'Xolisa', 'CCCC', 'sizwe@justice.gov.za', '$2a$10$hC9YWaJ6g8l2t.9kvsYHsOus3slOAZg/zlTKQgVx0OLrXnyOYryJu', 'official', 1, '2024-11-05 17:06:52', '2024-11-04 20:26:40', '2024-11-05 15:06:52');

-- --------------------------------------------------------

--
-- Table structure for table `verificationbusinessinfo`
--

CREATE TABLE `verificationbusinessinfo` (
  `verification_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `business_type` varchar(100) DEFAULT NULL,
  `business_status` text DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `verificationbusinessinfo`
--

INSERT INTO `verificationbusinessinfo` (`verification_id`, `application_id`, `business_type`, `business_status`, `is_completed`) VALUES
(10, 49, 'Sole Proprietorship', '', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `applicationstatus`
--
ALTER TABLE `applicationstatus`
  ADD PRIMARY KEY (`status_id`),
  ADD KEY `fk_application_id_status` (`application_id`),
  ADD KEY `fk_reviewer_id` (`reviewer_id`);

--
-- Indexes for table `appointmentemploymenthistory`
--
ALTER TABLE `appointmentemploymenthistory`
  ADD PRIMARY KEY (`application_id`);

--
-- Indexes for table `businessinfrastructuredetails`
--
ALTER TABLE `businessinfrastructuredetails`
  ADD PRIMARY KEY (`infrastructure_id`),
  ADD KEY `fk_application_id_infrastructure` (`application_id`);

--
-- Indexes for table `disqualificationrelationship`
--
ALTER TABLE `disqualificationrelationship`
  ADD PRIMARY KEY (`application_id`);

--
-- Indexes for table `employmentbusinesstrading`
--
ALTER TABLE `employmentbusinesstrading`
  ADD PRIMARY KEY (`application_id`);

--
-- Indexes for table `liquidatorapplication`
--
ALTER TABLE `liquidatorapplication`
  ADD PRIMARY KEY (`application_id`),
  ADD KEY `fk_user_id` (`user_id`);

--
-- Indexes for table `liquidatorapplicationsettings`
--
ALTER TABLE `liquidatorapplicationsettings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `officeaddresses`
--
ALTER TABLE `officeaddresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `application_id` (`application_id`);

--
-- Indexes for table `otps`
--
ALTER TABLE `otps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `personalinfo`
--
ALTER TABLE `personalinfo`
  ADD PRIMARY KEY (`personal_info_id`),
  ADD KEY `fk_application_id_personal_info` (`application_id`);

--
-- Indexes for table `qualificationsprofessionalmemberships`
--
ALTER TABLE `qualificationsprofessionalmemberships`
  ADD PRIMARY KEY (`id`),
  ADD KEY `application_id` (`application_id`);

--
-- Indexes for table `taxbondbankdocumentation`
--
ALTER TABLE `taxbondbankdocumentation`
  ADD PRIMARY KEY (`application_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `verificationbusinessinfo`
--
ALTER TABLE `verificationbusinessinfo`
  ADD PRIMARY KEY (`verification_id`),
  ADD KEY `fk_application_id_verification` (`application_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applicationstatus`
--
ALTER TABLE `applicationstatus`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `businessinfrastructuredetails`
--
ALTER TABLE `businessinfrastructuredetails`
  MODIFY `infrastructure_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `liquidatorapplication`
--
ALTER TABLE `liquidatorapplication`
  MODIFY `application_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `liquidatorapplicationsettings`
--
ALTER TABLE `liquidatorapplicationsettings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `officeaddresses`
--
ALTER TABLE `officeaddresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `otps`
--
ALTER TABLE `otps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `personalinfo`
--
ALTER TABLE `personalinfo`
  MODIFY `personal_info_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `qualificationsprofessionalmemberships`
--
ALTER TABLE `qualificationsprofessionalmemberships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `verificationbusinessinfo`
--
ALTER TABLE `verificationbusinessinfo`
  MODIFY `verification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applicationstatus`
--
ALTER TABLE `applicationstatus`
  ADD CONSTRAINT `fk_application_id_status` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `appointmentemploymenthistory`
--
ALTER TABLE `appointmentemploymenthistory`
  ADD CONSTRAINT `appointmentemploymenthistory_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `businessinfrastructuredetails`
--
ALTER TABLE `businessinfrastructuredetails`
  ADD CONSTRAINT `fk_application_id_infrastructure` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `disqualificationrelationship`
--
ALTER TABLE `disqualificationrelationship`
  ADD CONSTRAINT `disqualificationrelationship_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `employmentbusinesstrading`
--
ALTER TABLE `employmentbusinesstrading`
  ADD CONSTRAINT `employmentbusinesstrading_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `liquidatorapplication`
--
ALTER TABLE `liquidatorapplication`
  ADD CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `officeaddresses`
--
ALTER TABLE `officeaddresses`
  ADD CONSTRAINT `officeaddresses_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `otps`
--
ALTER TABLE `otps`
  ADD CONSTRAINT `otps_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `personalinfo`
--
ALTER TABLE `personalinfo`
  ADD CONSTRAINT `fk_application_id_personal_info` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `qualificationsprofessionalmemberships`
--
ALTER TABLE `qualificationsprofessionalmemberships`
  ADD CONSTRAINT `qualificationsprofessionalmemberships_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `taxbondbankdocumentation`
--
ALTER TABLE `taxbondbankdocumentation`
  ADD CONSTRAINT `taxbondbankdocumentation_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `verificationbusinessinfo`
--
ALTER TABLE `verificationbusinessinfo`
  ADD CONSTRAINT `fk_application_id_verification` FOREIGN KEY (`application_id`) REFERENCES `liquidatorapplication` (`application_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
