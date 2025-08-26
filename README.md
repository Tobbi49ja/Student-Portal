**Student Management System**

Welcome to the **Student Management System**, a web-based application designed to manage student profiles, courses, and administrative tasks. 
Built with a focus on simplicity and responsiveness, this project provides an intuitive interface for students to view and edit their profiles, 
manage courses, and for admins to oversee student data.(it's also my main project assigned to me by my tutor as a final project before been certified)

**Features**

•	Student Profile Management: View and edit personal details, change passwords, and upload profile pictures(still under development).
•	Course Management: Add, delete, and view courses with progress indicators.
•	Admin Dashboard: List, edit, and delete student records with a responsive design.
•	Responsive Design: Optimized for desktop and mobile, with scrollable tables and collapsible sections on smaller screens.
•	No Framework Approach: Pure JavaScript, HTML, and CSS for lightweight performance.

**Technologies Used**

•	Frontend: HTML, CSS (custom with Tailwind-inspired styling), JavaScript
•	Backend: Node.js, Express
•	Database: MongoDB with Mongoose
•	Authentication: JWT for secure user sessions
•	Libraries: bcrypt for password hashing

**Installation**

1.	Clone the Repository 
bash

git clone https://github.com/your-username/student-management-system.git cd student-management-system

3.	Install Dependencies 
bash
npm install

5.	Set Up Environment Variables: Create a .env file in the root directory and add: 
text
JWT_SECRET=your_jwt_secret LOCAL_URI=mongodb://localhost:27017/studentsDB ATLAS_URI=your_mongodb_atlas_uri PORT=8000
(contact me to give you that)

7.	Run the Application 
bash
nodemon server/server.js
or npm run dev

Open your browser and navigate to http://localhost:8000.

**Usage**
•	Student View: Access /profile after logging in to manage your profile and courses.
•	Admin View: Access /admin (for admin users) to manage student records.
•	Mobile Optimization: On screens below 768px, the student list is scrollable or collapsible (expand/row details with a toggle button).
File Structure
•	server/: Backend logic (e.g., studentsController.js, models)
•	public/: Static files (e.g., index.html, profile.html, style.css, admin.js, profile.js)
•	.env: Environment variables

**Contributing**

Feel free to fork this repository and submit pull requests. Please ensure:

•	Code follows the no-framework approach.
•	Changes are tested across desktop and mobile (below 425px, 375px, 320px).
•	Include updates to this README if adding significant features.

**Issues**
If you encounter bugs or have suggestions:
•	Open an issue on GitHub.
•	Provide details (e.g., browser, screen size, error logs) for quicker resolution.

**License**

This project is licensed under the MIT License - see the LICENSE file for details.

**Acknowledgments**

•	Inspired by modern web design principles.
•	Thanks to the open-source community for tools like Node.js, MongoDB, and Font Awesome.
________________________________________
Notes
•	Customization: Replace your-username with your GitHub username and update the repository URL. Add a LICENSE file if you haven’t already.
•	Date Context: The README is current as of August 23, 2025, 03:42 PM WAT, but no specific date is hardcoded since it’s a general document.
•	Content: It highlights the responsive fixes (scrollable tables, collapse/expand), your styling efforts, and the tech stack based on our discussions.
•	Length: Kept concise per your "quick answer" preference, focusing on key aspects.

