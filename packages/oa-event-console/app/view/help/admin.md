Admins will be able to access console settings in the Admin area.

### Users   <a class="anchor" name="admin-users"></a>

Users are the accounts that can log into Panther and access the console, there are two types of users, "Admin" and "User". The admins have access to the admin page which allow them to use features a normal user would not need to, such as creating new users or generating API keys.

#### Add user

Adding a new user requires a username, an email address and the type of privileges the user will have. Once those have been entered click add to create the user. A link will be sent to the email address provided to allow the user to setup a password.

### Edit Users

To access the menu to edit users click on an entry in the users list, this will bring up extra features such as saving, deleting users and resetting passwords.

#### Delete User

To delete a user click on the user in the users list and click on the delete button.

#### Changing Email

To change an email address click on the user in the users list, type the email address that you would like it to be changed to and click save.

#### Reset Password

To reset a password click on the user in the users list and click on reset password, this should send a password reset link to the email address linked to that user.
___
### Syslog Tarball

Using rsyslog is one of the most efficient methods to import event logs into Panther.

To do this you must:

<br  />

1.) Go to the Admin page.

<br  />
<img src="/help/rsyslog1.png" alt="Setting up rsyslog" class="helpimg" >
<br  />

2.) Download the rsyslog tarball that is generated for you.

<br  />
<br  />
<img src="/help/rsyslog2.png" alt="Setting up rsyslog" class="helpimg" >
<br  />

3.) Extract the tarball which contains the certificates you need along with the rsyslog configuration file.

<br  />
<img src="/help/rsyslog3.png" alt="Setting up rsyslog" class="helpimg" >
<br  />

4.) You can place the rsyslog.conf file in your etc/rsyslog.d/ directory along with the certificates. However this might clonflict with your previous rsyslog configurations therefore you could also configure the rsyslog.conf to cater to your system. This will send your systems' logs to your Panther instance console. A restart of rsyslog is required.

Visit [rsyslog](https://www.rsyslog.com/) for further help.
___
### API Keys

Panther also offers the ability to use an API to import logs.

To do this you must naviagte to the API Keys section and click on generate.

<br  />
<img src="/help/apigeneration.png" alt="Generating an api key" class="helpimg" >
<br  />

This will generate an API key that will allow registered users to import event logs into Panther.

For a tutorial on how to use the API [click here](#api)